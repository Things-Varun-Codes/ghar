<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MorningMemoriesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_it_is_on_for_a_new_person_and_sent_to_the_page(): void
    {
        $user = User::factory()->create()->refresh();

        $this->assertTrue($user->morning_memories);

        $this->actingAs($user)
            ->get(route('settings.notifications.show'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Settings/Notifications')
                ->where('morningMemories', true)
                ->has('subscriptions')
            );
    }

    public function test_a_person_turns_it_off_and_on(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.notifications.morning-memories.update'), ['morning_memories' => false])
            ->assertRedirect(route('settings.notifications.show'))
            ->assertSessionHasNoErrors();

        $this->assertFalse($user->fresh()->morning_memories);

        $this->actingAs($user)
            ->get(route('settings.notifications.show'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('morningMemories', false));

        $this->actingAs($user)
            ->patch(route('settings.notifications.morning-memories.update'), ['morning_memories' => true])
            ->assertSessionHasNoErrors();

        $this->assertTrue($user->fresh()->morning_memories);
    }

    public function test_it_only_changes_your_own_setting(): void
    {
        $ravi = User::factory()->create();
        $meera = User::factory()->create();

        $this->actingAs($ravi)
            ->patch(route('settings.notifications.morning-memories.update'), [
                'morning_memories' => false,
                'user_id' => $meera->id,
            ]);

        $this->assertFalse($ravi->fresh()->morning_memories);
        $this->assertTrue($meera->fresh()->morning_memories);
    }

    public function test_a_value_that_is_not_on_or_off_is_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.notifications.morning-memories.update'), ['morning_memories' => 'sometimes'])
            ->assertSessionHasErrors('morning_memories');

        $this->actingAs($user)
            ->patch(route('settings.notifications.morning-memories.update'))
            ->assertSessionHasErrors('morning_memories');

        $this->assertTrue($user->fresh()->morning_memories);
    }
}
