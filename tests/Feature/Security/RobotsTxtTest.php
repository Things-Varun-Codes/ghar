<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class RobotsTxtTest extends TestCase
{
    public function test_robots_txt_is_one_group_that_disallows_everything(): void
    {
        $rules = collect(preg_split('/\r?\n/', (string) file_get_contents(public_path('robots.txt'))))
            ->map(fn (string $line) => trim((string) preg_replace('/#.*$/', '', $line)))
            ->filter()
            ->values()
            ->all();

        // A crawler that finds a group naming it ignores the * group, and any Allow or narrower
        // Disallow opens a path, so the file has to be exactly these two lines.
        $this->assertSame(['User-agent: *', 'Disallow: /'], $rules);
    }
}
