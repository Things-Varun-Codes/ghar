<?php

namespace Database\Seeders\DevData;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

/**
 * Nisha lived here and was removed from the household. Seeded last, so every other row keeps
 * its id. What she left behind shows as "Nisha (deleted)": Ravi still owes her in General and
 * can settle up, Meera keeps her note and can't pay her citation.
 */
final class FormerMemberData
{
    public function seed(Household $h, User $nisha): void
    {
        $note = MailboxMessage::factory()->create([
            'sender_id' => $nisha->id,
            'body' => 'Moving out was the hard part. Water the money plant for me.',
            'posted_at' => $h->daysAgo(15),
        ]);
        $note->recipients()->attach($h->meera->id, ['read_at' => $h->daysAgo(14)]);

        $issued = $h->daysAgo(18);
        $citation = Citation::factory()->create([
            'issuer_id' => $nisha->id,
            'recipient_id' => $h->meera->id,
            'offence' => 'Borrowing my good scarf without asking',
            'incident_date' => $issued->toDateString(),
            'penalty' => 'Return it ironed',
            'status' => Citation::STATUS_ISSUED,
            'issued_at' => $issued,
        ]);
        $citation->ref_no = sprintf('OC/%d/%06d', $issued->year, $citation->id);
        $citation->save();

        $general = ExpenseGroup::general();
        $expense = Expense::factory()->state([
            'group_id' => $general->id,
            'paid_by_id' => $nisha->id,
            'title' => 'Farewell dinner',
            'amount' => 180000,
            'spent_on' => $h->today->subDays(16)->toDateString(),
            'created_at' => $h->daysAgo(16),
        ])->sharedBy($nisha, $h->ravi)->create();

        ExpenseActivity::log($general->id, $nisha, 'expense.created', $expense->id, [
            'title' => $expense->title,
            'amount' => $expense->amount,
            'spent_on' => $expense->spent_on->toDateString(),
            'paid_by_id' => $nisha->id,
            'split_mode' => $expense->split_mode,
            'shares' => $expense->shareMap(),
        ]);

        Item::factory()->create([
            'list_id' => CornerList::query()->where('slug', 'restaurants-we-keep-meaning-to-try-on-a-slow-sunday')->sole()->id,
            'title' => 'The coastal thali place near the old bus stand',
            'added_by_user_id' => $nisha->id,
            'added_at' => $h->daysAgo(17),
        ]);

        $comment = new EventComment([
            'event_id' => Event::query()->where('title', 'Monsoon drive to the coast')->sole()->id,
            'author_id' => $nisha->id,
            'body' => 'Wish I had come along.',
        ]);
        $comment->created_at = $h->daysAgo(16);
        $comment->save();

        $nisha->forceFill(['removed_at' => $h->daysAgo(14)])->save();
    }
}
