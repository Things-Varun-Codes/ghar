<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Support\SessionKey;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_profile_page_renders(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('settings.profile.show'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Settings/Profile'));
    }

    public function test_user_can_update_their_name(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => 'New Name',
                'email' => $user->email,
            ]);

        $response->assertRedirect(route('settings.profile.show'));
        $this->assertSame('New Name', $user->fresh()->name);
    }

    public function test_updating_name_without_changing_email_does_not_send_verification(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => 'New Name',
                'email' => $user->email,
            ]);

        $response->assertSessionHas(SessionKey::FLASH_DATA, function ($flash) {
            return isset($flash['toast'])
                && $flash['toast']['type'] === 'success'
                && ! empty($flash['toast']['message']);
        });
        $response->assertSessionMissing('status');
    }

    public function test_changing_email_keeps_persistent_status_and_fires_no_toast(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'old@example.com']);

        $response = $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => 'new@example.com',
            ]);

        $response->assertSessionHas('status', 'profile-updated-email-pending');
        $response->assertSessionMissing(SessionKey::FLASH_DATA);
    }

    public function test_email_pending_status_reaches_the_bridged_flash_prop(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'old@example.com']);

        $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => 'new@example.com',
            ]);

        $response = $this->actingAs($user)->get(route('settings.profile.show'));

        $response->assertInertia(fn ($page) => $page->where('flash.status', 'profile-updated-email-pending'));
    }

    public function test_name_is_required(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => '',
                'email' => $user->email,
            ]);

        $response->assertSessionHasErrors(['name']);
    }

    public function test_guest_cannot_update_profile(): void
    {
        $response = $this->patch(route('settings.profile.update'), [
            'name' => 'Hacker',
            'email' => 'hacker@example.com',
        ]);

        $response->assertRedirect(route('login'));
    }
}
