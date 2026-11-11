<?php

namespace Tests\Feature\Shell;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UnauthThemeShareTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_receives_active_theme_for_unauth_request(): void
    {
        // A non-default theme, so the assertion can't pass on the fallback.
        DB::table('settings')->updateOrInsert(['key' => 'active_theme'], ['value' => 'warm']);

        $this->get('/login')
            ->assertInertia(fn ($page) => $page->where('activeTheme', 'warm'));
    }

    public function test_html_root_carries_data_theme_for_unauth_request(): void
    {
        // A non-default theme, so the assertion can't pass on the fallback.
        DB::table('settings')->updateOrInsert(['key' => 'active_theme'], ['value' => 'warm']);

        $response = $this->get('/login');
        $response->assertSee('data-theme="warm"', false);
    }
}
