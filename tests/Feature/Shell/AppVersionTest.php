<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AppVersionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_release_version_links_to_its_release(): void
    {
        $this->dashboardWithVersion('1.1.0')->assertInertia(fn ($page) => $page
            ->where('version.label', 'v1.1.0')
            ->where('version.url', 'https://github.com/acme/ghar/releases/tag/v1.1.0'));
    }

    public function test_a_commit_version_links_to_its_commit(): void
    {
        $this->dashboardWithVersion('d5a34ea')->assertInertia(fn ($page) => $page
            ->where('version.label', 'd5a34ea')
            ->where('version.url', 'https://github.com/acme/ghar/commit/d5a34ea'));
    }

    public function test_any_other_version_is_plain_text(): void
    {
        $this->dashboardWithVersion('local')->assertInertia(fn ($page) => $page
            ->where('version', ['label' => 'local', 'url' => null]));
    }

    public function test_no_version_means_no_version_prop(): void
    {
        $this->dashboardWithVersion(null)->assertInertia(fn ($page) => $page->where('version', null));
    }

    public function test_a_signed_out_page_does_not_say_which_version_is_running(): void
    {
        config(['shell.version' => '1.1.0']);

        $this->get(route('login'))->assertOk()->assertInertia(fn ($page) => $page->where('version', null));
    }

    private function dashboardWithVersion(?string $version): TestResponse
    {
        config(['shell.version' => $version, 'shell.repository_url' => 'https://github.com/acme/ghar']);

        return $this->actingAs(User::factory()->create())->get(route('dashboard'))->assertOk();
    }
}
