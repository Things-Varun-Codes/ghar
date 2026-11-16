<?php

namespace Tests\Feature\History;

use App\Shell\Support\SignedUrls;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LocalMediaDiskTest extends TestCase
{
    private string $root;

    // Storage::fake() swaps in its own temporaryUrl builder, so this uses a real,
    // throwaway root to exercise the signed /storage route itself.
    protected function setUp(): void
    {
        parent::setUp();

        $this->root = storage_path('framework/testing/local-media-'.uniqid());
        config(['filesystems.disks.local.root' => $this->root]);
        Storage::forgetDisk('local');
        Storage::disk('local')->put('7/photo.jpg', 'jpeg-bytes');
    }

    protected function tearDown(): void
    {
        (new Filesystem)->deleteDirectory($this->root);

        parent::tearDown();
    }

    public function test_a_signed_url_serves_the_file(): void
    {
        $url = app(SignedUrls::class)->forDiskObject('local', '7/photo.jpg');

        $this->assertStringContainsString('/storage/7/photo.jpg?expires=', $url);
        $this->get($url)->assertOk()->assertStreamedContent('jpeg-bytes');
    }

    public function test_a_signed_file_may_be_cached_and_revalidated(): void
    {
        $url = app(SignedUrls::class)->forDiskObject('local', '7/photo.jpg');

        $response = $this->get($url)->assertOk();

        $response->assertHeader('Cache-Control', 'immutable, max-age=3600, private');
        $etag = $response->headers->get('ETag');
        $this->assertNotEmpty($etag);

        $this->get($url, ['If-None-Match' => $etag])->assertStatus(304);
    }

    public function test_the_file_is_not_readable_without_a_signature(): void
    {
        $response = $this->get('/storage/7/photo.jpg')->assertForbidden();

        $this->assertStringNotContainsString('max-age', (string) $response->headers->get('Cache-Control'));
    }

    public function test_a_tampered_path_is_refused(): void
    {
        $url = app(SignedUrls::class)->forDiskObject('local', '7/photo.jpg');

        $this->get(str_replace('7/photo.jpg', '8/photo.jpg', $url))->assertForbidden();
    }

    public function test_an_expired_url_is_refused(): void
    {
        $url = app(SignedUrls::class)->forDiskObject('local', '7/photo.jpg', ttlMinutes: 1);

        $this->travel(2)->minutes();

        $this->get($url)->assertForbidden();
    }
}
