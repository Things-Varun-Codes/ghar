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
}
