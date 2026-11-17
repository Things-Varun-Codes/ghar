<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use App\Shell\Services\Rooms;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EntryTypeSwitchesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function turnOff(string $type): void
    {
        app(Rooms::class)->setOption('our-mailbox', $type, false);
        app()->forgetScopedInstances();
    }

    /** @return array<string, array{string}> */
    public static function types(): array
    {
        return ['notes' => ['messages'], 'flowers' => ['flowers'], 'citations' => ['citations'], 'coupons' => ['coupons']];
    }

    #[DataProvider('types')]
    public function test_a_type_that_is_off_is_gone_from_the_landing_and_its_routes(string $type): void
    {
        $user = User::factory()->create();
        $this->turnOff($type);

        $this->actingAs($user)->get("/apps/our-mailbox/{$type}")->assertNotFound();

        $this->get('/apps/our-mailbox')->assertOk()->assertInertia(fn ($page) => $page
            ->where('types', fn ($types) => ! collect($types)->contains('key', $type) && count($types) === 3)
        );

        foreach (array_diff(array_column(self::types(), 0), [$type]) as $other) {
            $this->get("/apps/our-mailbox/{$other}")->assertOk();
        }
    }

    public function test_every_type_is_on_when_the_room_is_turned_on(): void
    {
        $this->actingAs(User::factory()->create())->get('/apps/our-mailbox')->assertInertia(fn ($page) => $page
            ->where('types', [
                ['key' => 'messages', 'label' => 'Notes'],
                ['key' => 'flowers', 'label' => 'Flowers'],
                ['key' => 'citations', 'label' => 'Citations'],
                ['key' => 'coupons', 'label' => 'Coupons'],
            ]));
    }

    public function test_a_type_that_is_off_sends_no_push_and_keeps_its_rows(): void
    {
        Notification::fake();
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();
        $citation = Citation::factory()->create(['issuer_id' => $issuer->id, 'recipient_id' => $recipient->id]);
        $this->turnOff('citations');

        $this->actingAs($issuer)->post('/apps/our-mailbox/citations', [
            'recipient_ids' => [$recipient->id], 'offence' => 'x', 'penalty' => 'y',
        ])->assertNotFound();
        $this->actingAs($recipient)->patch("/apps/our-mailbox/citations/{$citation->id}/pay")->assertNotFound();

        Notification::assertNotSentTo($recipient, GenericPushNotification::class);
        $this->assertDatabaseHas('mailbox_citations', ['id' => $citation->id, 'status' => 'issued']);

        app(Rooms::class)->setOption('our-mailbox', 'citations', true);
        app()->forgetScopedInstances();
        $this->get("/apps/our-mailbox/citations/{$citation->id}")->assertOk();
    }

    public function test_the_other_types_still_push_while_one_is_off(): void
    {
        Notification::fake();
        $this->turnOff('flowers');
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($issuer)->post('/apps/our-mailbox/citations', [
            'recipient_ids' => [$recipient->id], 'offence' => 'x', 'penalty' => 'y',
        ])->assertRedirect();

        Notification::assertSentTo($recipient, GenericPushNotification::class);
    }

    public function test_an_off_type_counts_for_nothing_in_the_summary(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        Citation::factory()->create(['issuer_id' => $other->id, 'recipient_id' => $user->id]);
        MailboxMessage::factory()->create(['sender_id' => $other->id]);
        $this->turnOff('citations');

        $this->actingAs($user)->get('/apps/our-mailbox')->assertInertia(fn ($page) => $page
            ->where('mailboxSummary.counts.citations', 0)
            ->where('mailboxSummary.citations_action_needed', 0)
            ->where('mailboxPeeks.citations', null));
    }

    public function test_the_whole_room_off_hides_the_types(): void
    {
        app(Rooms::class)->set('our-mailbox', false);
        app()->forgetScopedInstances();

        $this->actingAs(User::factory()->create())->get('/apps/our-mailbox/citations')->assertNotFound();
    }

    public function test_the_old_challan_addresses_redirect_to_citations(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/apps/our-mailbox/challans')
            ->assertStatus(301)->assertRedirect('/apps/our-mailbox/citations');
        $this->get('/apps/our-mailbox/challans/42')
            ->assertStatus(301)->assertRedirect('/apps/our-mailbox/citations/42');
        $this->get('/apps/our-mailbox/challans/abc')->assertNotFound();
    }

    public function test_issued_reference_numbers_survive_the_table_rename(): void
    {
        $citation = Citation::factory()->create(['ref_no' => 'OC/2025/000007']);

        $migration = require base_path('database/migrations/our-mailbox/2026_11_16_100000_rename_mailbox_challans_to_citations.php');
        $migration->down();
        $this->assertTrue(Schema::hasTable('mailbox_challans'));
        $this->assertFalse(Schema::hasTable('mailbox_citations'));
        $this->assertSame('OC/2025/000007', DB::table('mailbox_challans')->value('ref_no'));

        $migration->up();
        $this->assertSame('OC/2025/000007', Citation::findOrFail($citation->id)->ref_no);
    }
}
