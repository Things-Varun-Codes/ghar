<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use App\Shell\Notifications\ResetPasswordNotification;
use App\Shell\Services\Household;
use App\Shell\Services\Notify;
use App\Shell\Services\PushDispatcher;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class RemoveMemberTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->admin()->create(['name' => 'Asha Rao']);
    }

    public function test_removing_someone_keeps_their_row_and_ends_their_access(): void
    {
        $kabir = User::factory()->create(['name' => 'Kabir Rao']);
        $kabir->updatePushSubscription('https://push.example.test/kabir', 'key', 'auth', 'aesgcm');
        DB::table('sessions')->insert(['id' => 'kabir-session', 'user_id' => $kabir->id, 'payload' => '', 'last_activity' => time()]);
        $token = $kabir->getRememberToken();

        $this->actingAs($this->admin)
            ->post(route('admin.users.remove', $kabir))
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors();

        $kabir->refresh();
        $this->assertTrue($kabir->isFormer());
        $this->assertSame([], $kabir->getRoleNames()->all());
        $this->assertNotSame($token, $kabir->getRememberToken());
        $this->assertDatabaseMissing('sessions', ['user_id' => $kabir->id]);
        $this->assertDatabaseMissing('push_subscriptions', ['subscribable_id' => $kabir->id]);

        // Session and remember-me lookups go through the provider, which no longer finds them.
        $this->assertNull(Auth::guard('web')->getProvider()->retrieveById($kabir->id));
    }

    public function test_a_former_member_cannot_sign_in_or_reset_their_password(): void
    {
        Notification::fake();
        $kabir = User::factory()->former()->create();

        $this->post(route('login.store'), ['email' => $kabir->email, 'password' => 'password']);
        $this->assertGuest();

        $this->post(route('password.email'), ['email' => $kabir->email])->assertRedirect();
        Notification::assertNotSentTo($kabir, ResetPasswordNotification::class);
    }

    public function test_another_admin_can_be_removed_but_not_yourself(): void
    {
        $other = User::factory()->admin()->create();

        $this->actingAs($this->admin)->post(route('admin.users.remove', $this->admin))
            ->assertSessionHasErrors('remove');
        $this->assertFalse($this->admin->refresh()->isFormer());
        $this->assertTrue($this->admin->hasRole('admin'));

        $this->post(route('admin.users.remove', $other))->assertSessionHasNoErrors();
        $this->assertTrue($other->refresh()->isFormer());
    }

    public function test_restoring_brings_them_back_as_a_member(): void
    {
        $kabir = User::factory()->former()->create();

        $this->actingAs($this->admin)->post(route('admin.users.restore', $kabir))->assertSessionHasNoErrors();

        $kabir->refresh();
        $this->assertFalse($kabir->isFormer());
        $this->assertSame(['user'], $kabir->getRoleNames()->all());

        $this->post(route('logout'));
        $this->post(route('login.store'), ['email' => $kabir->email, 'password' => 'password']);
        $this->assertAuthenticatedAs($kabir);
    }

    public function test_only_a_former_member_can_be_deleted_for_good(): void
    {
        $kabir = User::factory()->create();

        $this->actingAs($this->admin)->delete(route('admin.users.destroy', $kabir))
            ->assertSessionHasErrors('delete');
        $this->assertModelExists($kabir);

        $kabir->forceFill(['removed_at' => now()])->save();

        $this->delete(route('admin.users.destroy', $kabir))->assertSessionHasNoErrors();
        $this->assertModelMissing($kabir);
    }

    public function test_inviting_a_former_members_email_points_to_restore(): void
    {
        User::factory()->former()->create(['name' => 'Kabir Rao', 'email' => 'kabir@example.test']);

        $this->actingAs($this->admin)
            ->post(route('admin.invites.store'), ['email' => 'kabir@example.test', 'role' => 'user'])
            ->assertSessionHasErrors(['email' => 'Kabir Rao is a former member. Restore them from Users instead.']);
    }

    public function test_a_former_member_is_named_as_deleted_and_left_out_of_the_household(): void
    {
        $nisha = User::factory()->former()->create(['name' => 'Nisha Rao']);
        $household = app(Household::class);

        $this->assertSame('Nisha (deleted)', $household->shortName($nisha));
        $this->assertSame('Asha', $household->shortName($this->admin));
        $this->assertNotContains($nisha->id, $household->members()->modelKeys());
        $this->assertNotContains($nisha->id, array_column($household->optionsFor($this->admin), 'id'));
        $this->assertContains($nisha->id, $household->everyone()->pluck('id')->all());
    }

    public function test_a_former_member_sharing_a_current_members_first_name_keeps_their_full_name(): void
    {
        User::factory()->create(['name' => 'Ravi Rao']);
        $formerRavi = User::factory()->former()->create(['name' => 'Ravi Menon']);

        $this->assertSame('Ravi Menon (deleted)', app(Household::class)->shortName($formerRavi));
    }

    public function test_no_push_reaches_a_former_member(): void
    {
        $nisha = User::factory()->former()->create();
        $notify = Mockery::mock(Notify::class);
        $notify->shouldNotReceive('send');
        $this->app->instance(Notify::class, $notify);

        app(PushDispatcher::class)->toUsers([$nisha], 'shell', 'test', 'Hello', '/dashboard');
    }
}
