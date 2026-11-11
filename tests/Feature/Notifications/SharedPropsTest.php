<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharedPropsTest extends TestCase
{
    use RefreshDatabase;

    public function test_vapid_public_key_is_present_in_authenticated_inertia_shared_props(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('vapidPublicKey'));
    }

    public function test_vapid_public_key_matches_config(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('vapidPublicKey', config('webpush.vapid.public_key')));
    }

    public function test_vapid_public_key_present_on_notifications_settings_page(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('settings.notifications.show'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Shell/Pages/Settings/Notifications')
            ->has('vapidPublicKey')
        );
    }
}
