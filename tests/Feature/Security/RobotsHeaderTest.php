<?php

namespace Tests\Feature\Security;

use App\Http\Middleware\AddRobotsHeader;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RobotsHeaderTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_kind_of_guest_response_asks_not_to_be_indexed(): void
    {
        // Statuses differ (a redirect, a 404, a refused unsigned media link); the header must
        // be there regardless.
        $paths = [
            '/login',
            '/',
            '/manifest.webmanifest',
            '/healthz',
            '/up',
            '/storage/not-signed.jpg',
            '/no-such-page',
            '/user/confirm-password',
        ];

        foreach ($paths as $path) {
            $this->assertSame(
                AddRobotsHeader::VALUE,
                $this->get($path)->headers->get('X-Robots-Tag'),
                "{$path} must carry X-Robots-Tag",
            );
        }

        $this->assertSame(
            AddRobotsHeader::VALUE,
            $this->getJson('/no-such-page')->headers->get('X-Robots-Tag'),
        );
    }

    public function test_signed_in_pages_ask_not_to_be_indexed(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/dashboard')
            ->assertHeader('X-Robots-Tag', AddRobotsHeader::VALUE);
    }

    public function test_the_sign_in_page_carries_noindex_without_javascript(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false);
    }

    public function test_the_sign_in_page_gives_a_link_preview_nothing_but_its_title(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('property="og:', false)
            ->assertDontSee('name="twitter:', false)
            ->assertDontSee('name="description"', false);
    }
}
