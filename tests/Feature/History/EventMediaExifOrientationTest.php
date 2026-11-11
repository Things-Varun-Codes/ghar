<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class EventMediaExifOrientationTest extends TestCase
{
    use RefreshDatabase;

    private ?string $fixturePath = null;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
    }

    protected function tearDown(): void
    {
        if ($this->fixturePath !== null && is_file($this->fixturePath)) {
            unlink($this->fixturePath);
        }

        parent::tearDown();
    }

    private function makeExifOrientation6Fixture(): string
    {
        $image = imagecreatetruecolor(400, 300);

        if ($image === false) {
            throw new RuntimeException('imagecreatetruecolor failed to build the fixture canvas');
        }

        // Non-uniform content so a rotation is not a no-op — two solid  quadrants in
        // different colors.
        $red = imagecolorallocate($image, 220, 30, 30);
        $blue = imagecolorallocate($image, 30, 30, 220);
        $grey = imagecolorallocate($image, 200, 200, 200);

        if ($red === false || $blue === false || $grey === false) {
            throw new RuntimeException('imagecolorallocate failed while building the fixture canvas');
        }

        imagefill($image, 0, 0, $grey);
        imagefilledrectangle($image, 0, 0, 199, 149, $red);
        imagefilledrectangle($image, 200, 150, 399, 299, $blue);

        ob_start();
        $encoded = imagejpeg($image, null, 90);
        $jpegBytes = ob_get_clean();

        if (! $encoded || ! is_string($jpegBytes) || $jpegBytes === '') {
            throw new RuntimeException('imagejpeg failed to encode the fixture canvas');
        }

        if (! str_starts_with($jpegBytes, "\xFF\xD8")) {
            throw new RuntimeException('encoded fixture does not start with a JPEG SOI marker');
        }

        // Big-endian ('MM') TIFF header + IFD0 with a single Orientation=6  entry, spliced in
        // as an APP1 segment immediately after the 2-byte  SOI marker.
        $tiff = 'MM'
            ."\x00\x2A" // TIFF magic 42
            ."\x00\x00\x00\x08" // offset to IFD0 (relative to TIFF header start)
            ."\x00\x01" // 1 directory entry
            ."\x01\x12" // tag 0x0112 = Orientation
            ."\x00\x03" // type 3 = SHORT
            ."\x00\x00\x00\x01" // count = 1
            ."\x00\x06\x00\x00" // value = 6, left-justified + zero-padded
            ."\x00\x00\x00\x00"; // next IFD offset = 0 (none)

        $exifPayload = "Exif\x00\x00".$tiff;
        // The length field counts itself (2 bytes) plus the payload — NOT  the FF E1 marker
        // bytes.
        $app1Length = pack('n', strlen($exifPayload) + 2);
        $app1Segment = "\xFF\xE1".$app1Length.$exifPayload;

        $spliced = substr($jpegBytes, 0, 2).$app1Segment.substr($jpegBytes, 2);

        $path = tempnam(sys_get_temp_dir(), 'exif-orientation-6-').'.jpg';
        file_put_contents($path, $spliced);

        return $path;
    }

    public function test_gd_auto_rotates_exif_orientation_through_the_real_pipeline(): void
    {
        $this->assertTrue(
            extension_loaded('exif'),
            'The `exif` PHP extension MUST be loaded — GdDriver::setExif() reads '
            .'EXIF orientation via exif_read_data(); without it, auto-rotation '
            .'silently no-ops. Cross-check the Dockerfile extension list.',
        );

        $this->fixturePath = $this->makeExifOrientation6Fixture();

        // GUARD THE FIXTURE ITSELF — if the byte splice above is wrong, the  fixture
        // silently becomes an ordinary JPEG and every assertion below  would pass (or fail)
        // for entirely the wrong reason.
        $rawExif = @exif_read_data($this->fixturePath);
        $this->assertIsArray(
            $rawExif,
            'exif_read_data() could not read the synthesized fixture at all — the '
            .'hand-spliced APP1 EXIF segment is malformed.',
        );
        $this->assertSame(
            6,
            $rawExif['Orientation'] ?? null,
            'The synthesized fixture does not report EXIF Orientation=6 — the '
            .'byte splice is wrong, so the pipeline assertion below would prove '
            .'nothing.',
        );

        /** @var User $user */
        $user = User::factory()->create();
        /** @var Event $event */
        $event = Event::factory()->create(['creator_id' => $user->id]);

        $file = new UploadedFile(
            $this->fixturePath,
            'photo.jpg',
            'image/jpeg',
            null,
            true, // test mode — without this the file is rejected as not-uploaded
        );

        $response = $this->actingAs($user)->post(
            "/apps/our-history/events/{$event->id}/media",
            ['media' => $file],
        );

        $response->assertStatus(303);

        $event->refresh();
        $media = $event->getMedia('photos')->first();
        $this->assertNotNull($media, 'photo should have attached');

        // Conversions are ->queued() but QUEUE_CONNECTION=sync in tests  (phpunit.xml), so
        // `medium` lands inline — no manual queue work.
        $mediumPath = $media->getPathRelativeToRoot('medium');
        $this->assertTrue(
            Storage::disk('s3')->exists($mediumPath),
            'medium conversion missing on fake bucket disk',
        );

        $mediumBytes = Storage::disk('s3')->get($mediumPath);
        $this->assertIsString($mediumBytes);

        $mediumImage = imagecreatefromstring($mediumBytes);
        $this->assertNotFalse(
            $mediumImage,
            'GD could not decode the medium conversion output',
        );

        $width = imagesx($mediumImage);
        $height = imagesy($mediumImage);

        $isPortrait = $height > $width;

        $this->assertTrue(
            $isPortrait,
            "medium conversion measured {$width}x{$height} — expected portrait ".
            '(height > width) if GD auto-rotates EXIF Orientation=6. A '.
            'landscape result here means GD does NOT auto-rotate, and '.
            'Event::registerMediaConversions needs ->orientation() added.',
        );

        $this->assertSame(300, $media->custom_properties['width'] ?? null);
        $this->assertSame(400, $media->custom_properties['height'] ?? null);
    }
}
