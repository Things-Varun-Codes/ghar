<?php

namespace Tests\Feature\DevOps;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MediaDiskConfigTest extends TestCase
{
    private ?string $original = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->original = $_ENV['MEDIA_DISK'] ?? null;
    }

    protected function tearDown(): void
    {
        $this->setMediaDisk($this->original);

        parent::tearDown();
    }

    /** @return array<string, array{?string, string}> */
    public static function values(): array
    {
        return [
            'empty' => ['', 'local'],
            'unset' => [null, 'local'],
            'bucket' => ['s3', 's3'],
            'any case' => ['S3', 's3'],
        ];
    }

    #[DataProvider('values')]
    public function test_every_config_resolves_the_same_disk(?string $value, string $expected): void
    {
        $this->setMediaDisk($value);

        $this->assertSame($expected, (require base_path('config/shell.php'))['media_disk']);
        $this->assertSame($expected, (require base_path('config/services.php'))['bouquet']['disk']);
        $this->assertSame($expected, (require base_path('config/media-library.php'))['disk_name']);
    }

    public function test_an_unknown_disk_fails_loudly(): void
    {
        $this->setMediaDisk('r2');

        $this->expectException(\InvalidArgumentException::class);

        require base_path('config/shell.php');
    }

    private function setMediaDisk(?string $value): void
    {
        if ($value === null) {
            unset($_ENV['MEDIA_DISK'], $_SERVER['MEDIA_DISK']);
            putenv('MEDIA_DISK');

            return;
        }

        $_ENV['MEDIA_DISK'] = $value;
        $_SERVER['MEDIA_DISK'] = $value;
        putenv("MEDIA_DISK={$value}");
    }
}
