<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ChallanRefNoUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_issues_yield_distinct_well_formed_ref_nos(): void
    {
        Notification::fake();

        $issuer = User::factory()->create();
        $recipient = User::factory()->create();

        $refNos = [];
        for ($i = 0; $i < 8; $i++) {
            $this->actingAs($issuer)->post('/apps/our-mailbox/challans', [
                'recipient_ids' => [$recipient->id],
                'offence' => 'Replied with just k',
                'penalty' => '2 kisses',
            ]);
        }

        $refNos = Challan::query()->pluck('ref_no')->all();

        $this->assertCount(8, $refNos);
        $this->assertSame(8, count(array_unique($refNos)), 'ref_nos must all be distinct');
        foreach ($refNos as $ref) {
            $this->assertMatchesRegularExpression('#^OC/\d{4}/\d{6}$#', $ref);
        }
    }

    public function test_unique_index_rejects_a_duplicate_ref_no(): void
    {
        Challan::factory()->create(['ref_no' => 'OC/2026/000042']);

        $this->expectException(QueryException::class);

        // Second row with the SAME ref_no must violate the UNIQUE index.
        Challan::factory()->create(['ref_no' => 'OC/2026/000042']);
    }
}
