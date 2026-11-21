<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Actions\PayCitation;
use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\SeedsPair;
use Tests\TestCase;

class CitationLifecycleTest extends TestCase
{
    use RefreshDatabase;
    use SeedsPair;

    public function test_issue_creates_one_issued_row_with_unique_ref_no_and_partner_recipient(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();

        $response = $this->actingAs($issuer)->post('/apps/our-exchange/citations', [
            'recipient_ids' => [$recipient->id],
            'offence' => 'Replied with just k',
            'penalty' => '3 hugs',
        ]);

        $citation = Citation::firstOrFail();
        $response->assertRedirect("/apps/our-exchange/citations/{$citation->id}");
        $this->assertSuccessToast($response, 'Citation issued.');

        $this->assertSame(Citation::STATUS_ISSUED, $citation->status);
        $this->assertSame($issuer->id, $citation->issuer_id);
        $this->assertSame($recipient->id, $citation->recipient_id);
        $this->assertMatchesRegularExpression('#^OC/\d{4}/\d{6}$#', $citation->ref_no);
        // Free-text offence/penalty persist verbatim — no catalog snapshot.
        $this->assertSame('Replied with just k', $citation->offence);
        $this->assertSame('3 hugs', $citation->penalty);
    }

    public function test_recipient_can_pay_an_issued_citation(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);

        $response = $this->actingAs($recipient)
            ->patch("/apps/our-exchange/citations/{$citation->id}/pay")
            ->assertRedirect();
        $this->assertSuccessToast($response, 'Citation paid.');

        $citation->refresh();
        $this->assertSame(Citation::STATUS_PAID, $citation->status);
        $this->assertNotNull($citation->settled_at);
    }

    public function test_double_pay_via_action_is_rejected_and_fires_no_extra_push(): void
    {
        Notification::fake();
        [$issuer, $recipient] = $this->seedPair();
        $citation = Citation::factory()->paid()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
        ]);
        $settledAt = $citation->settled_at;

        // Direct action call — defence in depth beyond the route policy gate.
        try {
            app(PayCitation::class)($citation, $recipient);
            $this->fail('Expected an illegal-transition abort.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }

        $citation->refresh();
        $this->assertSame(Citation::STATUS_PAID, $citation->status);
        $this->assertEquals($settledAt, $citation->settled_at);
        Notification::assertNothingSent();
    }

    public function test_issuing_to_several_people_creates_one_citation_each_and_pushes_to_each(): void
    {
        Notification::fake();
        [$issuer, $first] = $this->seedPair();
        $second = User::factory()->create();
        $bystander = User::factory()->create();

        $response = $this->actingAs($issuer)->post('/apps/our-exchange/citations', [
            'recipient_ids' => [$first->id, $second->id],
            'offence' => 'Hogged the remote',
            'penalty' => 'Make tea',
        ]);

        $response->assertRedirect('/apps/our-exchange/citations?tab=issued');
        $this->assertSuccessToast($response, '2 citations issued.');

        $this->assertSame(
            [$first->id, $second->id],
            Citation::query()->orderBy('id')->pluck('recipient_id')->all(),
        );
        Notification::assertSentTo($first, GenericPushNotification::class);
        Notification::assertSentTo($second, GenericPushNotification::class);
        Notification::assertNotSentTo($bystander, GenericPushNotification::class);
        Notification::assertNotSentTo($issuer, GenericPushNotification::class);
    }

    public function test_issuing_to_yourself_is_refused(): void
    {
        [$issuer] = $this->seedPair();

        $this->actingAs($issuer)
            ->from('/apps/our-exchange/citations')
            ->post('/apps/our-exchange/citations', [
                'recipient_ids' => [$issuer->id],
                'offence' => 'Hogged the remote',
                'penalty' => 'Make tea',
            ])
            ->assertSessionHasErrors('recipient_ids.0');

        $this->assertDatabaseCount('mailbox_citations', 0);
    }
}
