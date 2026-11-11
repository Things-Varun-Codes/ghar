<?php

namespace Tests\Feature\Notifications;

use App\Shell\Models\User;
use App\Shell\Notifications\TestNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotifyTestCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_exits_zero_on_valid_user_and_dispatches_test_notification(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        $exitCode = Artisan::call('notify:test', ['user-id' => $user->id]);

        $this->assertSame(0, $exitCode, 'notify:test should exit 0 on a valid user id');

        Notification::assertSentTo($user, TestNotification::class);
    }

    public function test_command_exits_nonzero_on_unknown_user_id(): void
    {
        Notification::fake();

        $exitCode = Artisan::call('notify:test', ['user-id' => 999999]);

        $this->assertNotSame(0, $exitCode, 'notify:test should fail when user is not found');
        $this->assertSame(1, $exitCode, 'notify:test should return Command::FAILURE (1) for unknown user');

        Notification::assertNothingSent();
    }

    public function test_command_output_includes_ios_first_push_reminder(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        Artisan::call('notify:test', ['user-id' => $user->id]);

        $output = Artisan::output();

        $this->assertStringContainsString(
            "If push doesn't arrive within 10s on iOS PWA",
            $output,
            'notify:test output must include the iOS first-push reminder'
        );
    }

    public function test_command_dispatches_test_notification_class_not_generic(): void
    {
        Notification::fake();

        /** @var User $user */
        $user = User::factory()->create();

        Artisan::call('notify:test', ['user-id' => $user->id]);

        Notification::assertSentTo($user, TestNotification::class);
    }
}
