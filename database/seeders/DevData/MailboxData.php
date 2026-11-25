<?php

namespace Database\Seeders\DevData;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Models\SavedPrompt;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Filesystem\Filesystem;

/**
 * Mailbox rows in every state. Row 1 of each type goes from Ravi to Meera
 * only: the fixture for "a recipient can see it, nobody else can". For expenses that fixture is
 * the "Coast trip" group, which only Ravi and Meera are in.
 */
final class MailboxData
{
    /** Postcards generated against the previous seed land here, outside the media library. */
    public static function clearFiles(Filesystem $disk): void
    {
        $disk->deleteDirectory('postcards');
    }

    public function seed(Household $h): void
    {
        $this->notes($h);
        $this->postcards($h);
        $this->coupons($h);
        $this->citations($h);
        $this->expenses($h);
    }

    private function notes(Household $h): void
    {
        // [body, sender, days ago, [recipient, read days ago or null]...]
        $notes = [
            ['Don\'t tell Kabir: the cake is hidden behind the rice tin.', $h->ravi, 1, [[$h->meera, null]]],
            ['Thank you for sitting with me at the clinic.', $h->ravi, 3, [[$h->meera, 2]]],
            ['Whoever finished the pickle owes the house a new jar.', $h->meera, 2, [[$h->ravi, 1], [$h->admin, null]]],
            ['Family dinner on Saturday, phones in the basket.', $h->admin, 4, [[$h->ravi, 3], [$h->meera, 3], [$h->kabir, null]]],
            ['Can I borrow the car on Friday? I will fill the tank.', $h->kabir, 5, [[$h->admin, 4]]],
            ['Your exam went better than you think. Go to sleep.', $h->admin, 8, [[$h->kabir, 7]]],
            ['The plumber is coming at 10, someone be home.', $h->meera, 10, [[$h->admin, 9], [$h->ravi, null]]],
            ['Left you the last samosa. You are welcome.', $h->kabir, 13, [[$h->meera, null]]],
            ['Found our old holiday photos in the loft.', $h->ravi, 20, [[$h->admin, 18], [$h->meera, 19], [$h->kabir, 19]]],
            ['Proud of you for today.', $h->meera, 26, [[$h->kabir, 25]]],
        ];

        foreach ($notes as [$body, $sender, $days, $recipients]) {
            $note = MailboxMessage::factory()->create([
                'sender_id' => $sender->id,
                'body' => $body,
                'posted_at' => $h->daysAgo($days),
            ]);

            $this->attach($h, $note->recipients(), $recipients);
        }
    }

    private function postcards(Household $h): void
    {
        // [note, sender, days ago, prompt, [recipient, read days ago or null]...]
        $postcards = [
            ['For the bad week. It is nearly over.', $h->ravi, 2, 'A field of lavender under a soft grey sky, in watercolour.', [[$h->meera, null]]],
            ['For getting us all through the move.', $h->admin, 6, 'Cardboard boxes stacked by an open door, sunlight coming in.', [[$h->ravi, 5], [$h->meera, null], [$h->kabir, null]]],
            [null, $h->kabir, 9, 'A single red tulip in a jam jar.', [[$h->admin, 8]]],
            ['Good luck tomorrow!', $h->meera, 14, 'A paper boat setting off across a pond.', [[$h->kabir, 13]]],
        ];

        foreach ($postcards as $i => [$note, $sender, $days, $prompt, $recipients]) {
            $postcard = Postcard::factory()->create([
                'sender_id' => $sender->id,
                'note' => $note,
                'image_key' => $h->storeImage("postcard-{$i}.jpg", PlaceholderImage::jpeg('A postcard', $i + 1, 768, 768)),
                'prompt' => $prompt,
                'posted_at' => $h->daysAgo($days),
            ]);

            $this->attach($h, $postcard->recipients(), $recipients);
        }

        SavedPrompt::create(['user_id' => $h->ravi->id, 'name' => 'Our street', 'prompt' => 'Our street after rain, in ink and wash.']);
    }

    private function coupons(Household $h): void
    {
        $inAMonth = $h->today->addDays(30);

        // [title, description, issuer, recipient, days ago, quantity, redeemed, status, requested, last fulfilled, expires]
        $coupons = [
            ['Breakfast in bed', 'Any Sunday, your choice of eggs.', $h->ravi, $h->meera, 3, 3, 0, Coupon::STATUS_ISSUED, null, null, $inAMonth],
            ['One foot massage', null, $h->meera, $h->ravi, 7, 2, 0, Coupon::STATUS_REQUESTED, 1, null, null],
            ['Pick the movie', 'No complaints allowed.', $h->admin, $h->kabir, 12, 5, 2, Coupon::STATUS_ISSUED, null, 4, null],
            ['Dishes off the hook', null, $h->kabir, $h->admin, 20, 2, 2, Coupon::STATUS_DEPLETED, null, 6, null],
            ['Long drive, you choose the music', null, $h->ravi, $h->admin, 5, 1, 0, Coupon::STATUS_ISSUED, null, null, null],
            ['Ice cream run', 'Expired, sadly.', $h->meera, $h->kabir, 45, 1, 0, Coupon::STATUS_ISSUED, null, null, $h->today->subDays(5)],
        ];

        foreach ($coupons as [$title, $description, $issuer, $recipient, $days, $quantity, $redeemed, $status, $requested, $fulfilled, $expires]) {
            $issued = $h->daysAgo($days);

            $coupon = Coupon::factory()->create([
                'issuer_id' => $issuer->id,
                'recipient_id' => $recipient->id,
                'code' => null,
                'title' => $title,
                'description' => $description,
                'quantity' => $quantity,
                'redeemed_count' => $redeemed,
                'expires_at' => $expires?->toDateString(),
                'status' => $status,
                'requested_at' => $requested === null ? null : $h->daysAgo($requested),
                'issued_at' => $issued,
                'last_fulfilled_at' => $fulfilled === null ? null : $h->daysAgo($fulfilled),
            ]);

            $coupon->code = sprintf('GC/%d/%06d', $issued->year, $coupon->id);
            $coupon->save();
        }
    }

    private function citations(Household $h): void
    {
        // [offence, penalty, issuer, recipient, days ago, place, repeat, remarks, paid days ago]
        $citations = [
            ['Leaving wet towels on the bed', 'Fold the laundry', $h->ravi, $h->meera, 2, 'Main bedroom', false, 'First warning.', null],
            ['Finishing the good biscuits', 'Replace them, with interest', $h->meera, $h->ravi, 9, 'Kitchen', true, null, 6],
            ['Switching off the wifi at 9pm', 'Ten extra minutes', $h->kabir, $h->admin, 4, 'The router', false, 'Unconstitutional.', null],
            ['Shoes in the hallway, again', 'Sweep the hallway', $h->admin, $h->kabir, 11, 'Hallway', true, null, 8],
            ['Practising drums after dinner', 'Headphones for a week', $h->ravi, $h->kabir, 16, null, false, null, null],
        ];

        foreach ($citations as [$offence, $penalty, $issuer, $recipient, $days, $place, $repeat, $remarks, $paidAgo]) {
            $issued = $h->daysAgo($days);

            $citation = Citation::factory()->create([
                'issuer_id' => $issuer->id,
                'recipient_id' => $recipient->id,
                'ref_no' => null,
                'offence' => $offence,
                'incident_date' => $issued->toDateString(),
                'incident_place' => $place,
                'is_repeat' => $repeat,
                'penalty' => $penalty,
                'remarks' => $remarks,
                'status' => $paidAgo === null ? Citation::STATUS_ISSUED : Citation::STATUS_PAID,
                'settled_at' => $paidAgo === null ? null : $h->daysAgo($paidAgo),
                'issued_at' => $issued,
            ]);

            $citation->ref_no = sprintf('OC/%d/%06d', $issued->year, $citation->id);
            $citation->save();
        }
    }

    /**
     * Amounts are paise. General: equal and exact splits, one that leaves a remainder, a
     * repayment and a deleted duplicate. Coast trip: Meera owes Ravi. Diwali gifts: settled, then
     * archived.
     */
    private function expenses(Household $h): void
    {
        $general = ExpenseGroup::general();
        $coast = ExpenseGroup::factory()->of($h->ravi, $h->meera)->create(['name' => 'Coast trip']);
        $diwali = ExpenseGroup::factory()->of($h->admin, $h->ravi, $h->kabir)->create(['name' => 'Diwali gifts']);

        foreach ([$coast, $diwali] as $group) {
            ExpenseActivity::log($group->id, $group->created_by_id === $h->ravi->id ? $h->ravi : $h->admin, 'group.created', data: [
                'name' => $group->name,
                'member_ids' => $group->memberIds(),
            ]);
        }

        // [group, title, amount, payer, days ago, equal participants | exact shares | receiver, deleted]
        $rows = [
            [$general, 'Groceries', 240000, $h->admin, 12, $h->members(), false],
            [$general, 'Auto to the station', 10000, $h->meera, 9, [$h->admin, $h->ravi, $h->meera], false],
            [$general, 'School trip fee', 150000, $h->admin, 7, [$h->ravi->id => 90000, $h->meera->id => 60000], false],
            [$general, 'Payment', 60000, $h->kabir, 5, $h->admin, false],
            [$general, 'Groceries (entered twice)', 240000, $h->admin, 12, $h->members(), true],
            [$coast, 'Homestay', 800000, $h->ravi, 20, [$h->ravi, $h->meera], false],
            [$coast, 'Fish lunch', 120000, $h->meera, 19, [$h->ravi, $h->meera], false],
            [$diwali, 'Sweets and lamps', 90000, $h->admin, 30, [$h->admin, $h->ravi, $h->kabir], false],
            [$diwali, 'Payment', 30000, $h->ravi, 28, $h->admin, false],
            [$diwali, 'Payment', 30000, $h->kabir, 27, $h->admin, false],
        ];

        foreach ($rows as [$group, $title, $amount, $payer, $days, $split, $deleted]) {
            $factory = Expense::factory()->state([
                'group_id' => $group->id,
                'paid_by_id' => $payer->id,
                'title' => $title,
                'amount' => $amount,
                'spent_on' => $h->today->subDays($days)->toDateString(),
                'created_at' => $h->daysAgo($days),
            ]);

            $expense = match (true) {
                $split instanceof User => $factory->paidTo($split)->create(),
                array_is_list($split) => $factory->sharedBy(...$split)->create(),
                default => $factory->owedBy($split)->create(),
            };

            $summary = [
                'title' => $title,
                'amount' => $amount,
                'spent_on' => $expense->spent_on->toDateString(),
                'paid_by_id' => $payer->id,
                'split_mode' => $expense->split_mode,
                'shares' => $expense->shareMap(),
            ];

            ExpenseActivity::log($group->id, $payer, $split instanceof User ? 'settlement.recorded' : 'expense.created', $expense->id, $split instanceof User
                ? ['from_id' => $payer->id, 'to_id' => $split->id, 'amount' => $amount]
                : $summary);

            if ($deleted) {
                $expense->deleted_by_id = $payer->id;
                $expense->save();
                $expense->delete();

                ExpenseActivity::log($group->id, $payer, 'expense.deleted', $expense->id, $summary);
            }
        }

        $diwali->archived_at = $h->daysAgo(26);
        $diwali->save();
        ExpenseActivity::log($diwali->id, $h->admin, 'group.archived');
    }

    /**
     * @param  list<array{0: User, 1: int|null}>  $recipients
     */
    private function attach(Household $h, $relation, array $recipients): void
    {
        foreach ($recipients as [$recipient, $readDaysAgo]) {
            /** @var CarbonImmutable|null $readAt */
            $readAt = $readDaysAgo === null ? null : $h->daysAgo($readDaysAgo);

            $relation->attach($recipient->id, ['read_at' => $readAt]);
        }
    }
}
