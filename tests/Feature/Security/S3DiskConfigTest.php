<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class S3DiskConfigTest extends TestCase
{
    public function test_the_bucket_disk_is_private(): void
    {
        $disk = config('filesystems.disks.s3');

        $this->assertSame('s3', $disk['driver']);
        // Omitted on purpose: objects keep the bucket's default private ACL.
        $this->assertArrayNotHasKey('visibility', $disk);
    }

    public function test_path_style_and_region_default_for_r2_and_minio(): void
    {
        $disk = (require base_path('config/filesystems.php'))['disks']['s3'];

        $this->assertTrue($disk['use_path_style_endpoint']);
        $this->assertSame('auto', $disk['region']);
    }
}
