<?php

namespace Tests\Feature\Settings;

use App\Enums\Theme;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AppearanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_everyone_starts_on_the_device_setting(): void
    {
        $user = User::factory()->create()->refresh();

        $this->assertSame(Theme::System, $user->theme);

        $response = $this->actingAs($user)->get(route('settings.appearance.show'));
        $this->assertDoesNotMatchRegularExpression('/<html[^>]*data-theme/', (string) $response->getContent());

        $response->assertOk()
            ->assertSee('media="(prefers-color-scheme: dark)"', false)
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Settings/Appearance')
                ->where('auth.user.theme', 'system')
            );
    }

    public function test_a_person_picks_dark_and_every_page_is_dark(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.appearance.update'), ['theme' => 'dark'])
            ->assertRedirect(route('settings.appearance.show'))
            ->assertSessionHasNoErrors();

        $this->assertSame(Theme::Dark, $user->fresh()->theme);

        $this->actingAs($user->fresh())
            ->get(route('dashboard'))
            ->assertSee('<html lang="en" data-theme="dark">', false)
            ->assertSee('content="#1c1916" media="all"', false)
            ->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user.theme', 'dark'));
    }

    public function test_only_the_three_choices_are_taken(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.appearance.update'), ['theme' => 'purple'])
            ->assertSessionHasErrors('theme');

        $this->assertSame(Theme::System, $user->fresh()->theme);
    }

    public function test_it_needs_a_sign_in(): void
    {
        $this->patch(route('settings.appearance.update'), ['theme' => 'dark'])
            ->assertRedirect(route('login'));

        $this->assertDoesNotMatchRegularExpression('/<html[^>]*data-theme/', (string) $this->get(route('login'))->getContent());
    }
}
