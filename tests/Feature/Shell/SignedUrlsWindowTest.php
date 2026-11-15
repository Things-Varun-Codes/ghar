<?php

namespace Tests\Feature\Shell;

use App\Shell\Support\SignedUrls;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SignedUrlsWindowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'filesystems.disks.s3.key' => 'test-key',
            'filesystems.disks.s3.secret' => 'test-secret',
            'filesystems.disks.s3.bucket' => 'test-bucket',
            'filesystems.disks.s3.endpoint' => 'https://bucket.example.test',
        ]);
        Storage::forgetDisk('s3');
    }

    public function test_the_same_file_keeps_one_url_for_the_whole_window(): void
    {
        $this->travelTo('2026-03-01 10:00:05');
        $first = app(SignedUrls::class)->forDiskObject('s3', 'photos/a.webp');

        $this->travelTo('2026-03-01 10:59:59');
        $late = app(SignedUrls::class)->forDiskObject('s3', 'photos/a.webp');

        $this->travelTo('2026-03-01 11:00:00');
        $next = app(SignedUrls::class)->forDiskObject('s3', 'photos/a.webp');

        $this->assertSame($first, $late, 'A re-signed URL defeats the browser cache.');
        $this->assertNotSame($first, $next);
    }

    public function test_a_url_issued_at_the_end_of_a_window_still_lives_a_full_ttl(): void
    {
        $this->travelTo('2026-03-01 10:59:59');
        $url = app(SignedUrls::class)->forDiskObject('s3', 'photos/a.webp');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        $this->assertSame('20260301T100000Z', $query['X-Amz-Date']);
        $this->assertSame('7200', $query['X-Amz-Expires']);
        $this->assertSame('private, max-age=3600, immutable', $query['response-cache-control']);
    }

    public function test_the_local_disk_url_is_stable_too(): void
    {
        $this->travelTo('2026-03-01 10:00:05');
        $first = app(SignedUrls::class)->forDiskObject('local', 'photos/a.webp');

        $this->travelTo('2026-03-01 10:40:00');

        $this->assertSame($first, app(SignedUrls::class)->forDiskObject('local', 'photos/a.webp'));
    }
}
