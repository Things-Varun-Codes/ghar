<?php

namespace Tests\Feature\DevOps;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UserForeignKeyOnDeleteContractTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array<string, string>> table => [column => on_delete] */
    private static function expectations(): array
    {
        return [
            'corner_songs' => ['added_by_user_id' => 'restrict', 'done_by_user_id' => 'set null'],
            'corner_movies' => ['added_by_user_id' => 'restrict', 'done_by_user_id' => 'set null'],
            'corner_activities' => ['added_by_user_id' => 'restrict', 'done_by_user_id' => 'set null'],
            'corner_places' => ['added_by_user_id' => 'restrict', 'done_by_user_id' => 'set null'],
            'mailbox_messages' => ['sender_id' => 'restrict'],
            'mailbox_message_recipients' => ['user_id' => 'restrict'],
            'mailbox_challans' => ['issuer_id' => 'restrict', 'recipient_id' => 'restrict'],
            'mailbox_coupons' => ['issuer_id' => 'restrict', 'recipient_id' => 'restrict'],
            'mailbox_bouquets' => ['sender_id' => 'restrict'],
            'mailbox_bouquet_recipients' => ['user_id' => 'restrict'],
            'our_history_events' => ['creator_id' => 'set null'],
            'our_history_event_changes' => ['user_id' => 'set null'],
            'invitations' => ['invited_by_user_id' => 'set null'],
            'short_links' => ['created_by' => 'set null'],
        ];
    }

    public function test_user_foreign_keys_declare_the_expected_on_delete_action(): void
    {
        foreach (self::expectations() as $table => $columns) {
            $foreignKeys = collect(Schema::getForeignKeys($table));

            foreach ($columns as $column => $expected) {
                $match = $foreignKeys->first(
                    fn (array $fk): bool => $fk['columns'] === [$column] && $fk['foreign_table'] === 'users',
                );

                $this->assertNotNull($match, "Expected a foreign key from {$table}.{$column} to users.");
                $this->assertSame(
                    $expected,
                    strtolower($match['on_delete']),
                    "{$table}.{$column} must declare ON DELETE {$expected}.",
                );
            }
        }
    }
}
