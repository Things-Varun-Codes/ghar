<?php

namespace Tests\Feature\Shell;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UnauthThemeShareTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_carries_the_active_theme_as_a_prop_and_on_the_html_root(): void
    {
        // A non-default theme, so the assertion can't pass on the fallback.
        DB::table('settings')->updateOrInsert(['key' => 'active_theme'], ['value' => 'warm']);

        $this->get('/login')
            ->assertInertia(fn ($page) => $page->where('activeTheme', 'warm'))
            ->assertSee('data-theme="warm"', false);
    }
}
