<?php

namespace Tests\Feature\Admin;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CannotDeleteUserWithSharedContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_admin_cannot_delete_a_user_who_owns_corner_and_mailbox_content(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $other = User::factory()->create();

        $song = Song::factory()->create(['added_by_user_id' => $target->id]);
        $message = MailboxMessage::factory()->to($other)->create(['sender_id' => $target->id]);

        $response = $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $target->id]));

        $response->assertRedirect(route('admin.users.index'));
        $response->assertSessionHasErrors('delete');

        // The refusal names what is in the way.
        $refusal = session('errors')->getBag('default')->first('delete');
        $this->assertStringContainsString('Corner songs', $refusal);
        $this->assertStringContainsString('Mailbox messages', $refusal);

        $this->assertDatabaseHas('users', ['id' => $target->id]);
        $this->assertDatabaseHas('corner_songs', ['id' => $song->id]);
        $this->assertDatabaseHas('mailbox_messages', ['id' => $message->id]);
    }

    public function test_recipient_side_content_also_blocks_the_delete(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $sender = User::factory()->create();

        // target only ever RECEIVED a message — a sender-only guard would miss this.
        $message = MailboxMessage::factory()->to($target)->create(['sender_id' => $sender->id]);

        $response = $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $target->id]));

        $response->assertRedirect(route('admin.users.index'));
        $response->assertSessionHasErrors('delete');

        $this->assertDatabaseHas('users', ['id' => $target->id]);
        $this->assertDatabaseHas('mailbox_messages', ['id' => $message->id]);
    }

    public function test_database_refuses_the_delete_even_when_the_controller_is_bypassed(): void
    {
        $target = User::factory()->create();
        Song::factory()->create(['added_by_user_id' => $target->id]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        \Illuminate\Support\Facades\DB::table('users')->where('id', $target->id)->delete();
    }
}
