<?php

namespace Database\Seeders\DevData;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;

/**
 * Mailbox rows in every state. Row 1 of each type goes from Ravi to Meera
 * only: the fixture for "a recipient can see it, nobody else can".
 */
final class MailboxData
{
    public function seed(Household $h): void
    {
        $this->notes($h);
        $this->flowers($h);
        $this->coupons($h);
        $this->challans($h);
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

    private function flowers(Household $h): void
    {
        $catalog = collect(config('mailbox-bouquets'))->keyBy('key');
        $pick = fn (array $keys): array => array_values($catalog->only($keys)->all());

        // [note, sender, days ago, flowers, [recipient, read days ago or null]...]
        $bouquets = [
            ['For the bad week. It is nearly over.', $h->ravi, 2, ['lavender', 'chamomile'], [[$h->meera, null]]],
            ['For getting us all through the move.', $h->admin, 6, ['sunflower', 'daisy'], [[$h->ravi, 5], [$h->meera, null], [$h->kabir, null]]],
            [null, $h->kabir, 9, ['tulip'], [[$h->admin, 8]]],
            ['Good luck tomorrow!', $h->meera, 14, ['jasmine', 'sweet_pea'], [[$h->kabir, 13]]],
        ];

        foreach ($bouquets as $i => [$note, $sender, $days, $flowers, $recipients]) {
            $bouquet = Bouquet::factory()->create([
                'sender_id' => $sender->id,
                'note' => $note,
                'image_key' => $h->storeImage("bouquet-{$i}.jpg", PlaceholderImage::jpeg('A bouquet', $i + 1, 768, 768)),
                'flowers' => $pick($flowers),
                'posted_at' => $h->daysAgo($days),
            ]);

            $this->attach($h, $bouquet->recipients(), $recipients);
        }
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

    private function challans(Household $h): void
    {
        // [offence, penalty, issuer, recipient, days ago, place, repeat, remarks, paid days ago]
        $challans = [
            ['Leaving wet towels on the bed', 'Fold the laundry', $h->ravi, $h->meera, 2, 'Main bedroom', false, 'First warning.', null],
            ['Finishing the good biscuits', 'Replace them, with interest', $h->meera, $h->ravi, 9, 'Kitchen', true, null, 6],
            ['Switching off the wifi at 9pm', 'Ten extra minutes', $h->kabir, $h->admin, 4, 'The router', false, 'Unconstitutional.', null],
            ['Shoes in the hallway, again', 'Sweep the hallway', $h->admin, $h->kabir, 11, 'Hallway', true, null, 8],
            ['Practising drums after dinner', 'Headphones for a week', $h->ravi, $h->kabir, 16, null, false, null, null],
        ];

        foreach ($challans as [$offence, $penalty, $issuer, $recipient, $days, $place, $repeat, $remarks, $paidAgo]) {
            $issued = $h->daysAgo($days);

            $challan = Challan::factory()->create([
                'issuer_id' => $issuer->id,
                'recipient_id' => $recipient->id,
                'ref_no' => null,
                'offence' => $offence,
                'incident_date' => $issued->toDateString(),
                'incident_place' => $place,
                'is_repeat' => $repeat,
                'penalty' => $penalty,
                'remarks' => $remarks,
                'status' => $paidAgo === null ? Challan::STATUS_ISSUED : Challan::STATUS_PAID,
                'settled_at' => $paidAgo === null ? null : $h->daysAgo($paidAgo),
                'issued_at' => $issued,
            ]);

            $challan->ref_no = sprintf('OC/%d/%06d', $issued->year, $challan->id);
            $challan->save();
        }
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
