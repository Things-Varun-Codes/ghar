<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class RobotsTxtTest extends TestCase
{
    private string $robotsPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->robotsPath = public_path('robots.txt');
    }

    public function test_robots_txt_file_exists_in_public(): void
    {
        $this->assertFileExists($this->robotsPath, 'public/robots.txt must exist for nginx to serve it');
    }

    public function test_robots_txt_disallows_all_crawlers(): void
    {
        $this->assertFileExists($this->robotsPath);
        $contents = file_get_contents($this->robotsPath);

        $this->assertStringContainsString(
            'User-agent: *',
            $contents,
            'robots.txt must target all user agents'
        );
        $this->assertStringContainsString(
            'Disallow: /',
            $contents,
            'robots.txt must disallow all crawlers from all paths'
        );
    }

    public function test_robots_txt_does_not_contain_permissive_allow_directive(): void
    {
        $this->assertFileExists($this->robotsPath);
        $contents = file_get_contents($this->robotsPath);

        // A bare "Allow: /" line would shadow the Disallow: / for first-match crawlers.
        // Normalise line endings and check no standalone Allow: / line is present.
        $lines = preg_split('/\r?\n/', $contents);
        foreach ($lines as $line) {
            $this->assertNotEquals(
                'Allow: /',
                trim($line),
                'robots.txt must not contain a permissive "Allow: /" directive'
            );
        }
    }
}
