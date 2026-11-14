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

        // A bare "Allow: /" line would shadow the Disallow for first-match crawlers.
        $this->assertNotContains('Allow: /', array_map('trim', preg_split('/\r?\n/', $contents)));
    }
}
