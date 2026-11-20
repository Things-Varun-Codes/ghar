<?php

namespace App\MiniApps\History\Console;

use App\MiniApps\History\Models\DigestClaim;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\History\Support\OnThisDay;
use App\MiniApps\History\Support\RequestedMoment;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Services\PushDispatcher;
use App\Shell\Services\Rooms;
use App\Shell\Support\Region;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class SendMorningMemories extends Command
{
    public const TAG = HistoryServiceProvider::SLUG.':on-this-day';

    private const TITLE_LIMIT = 60;

    protected $signature = 'history:morning-memories';

    protected $description = "Push the morning digest of today's birthdays and memories, once per household day.";

    public function handle(Rooms $rooms, Household $household, PushDispatcher $push): int
    {
        // No claim while the room is off: turned back on before noon, the morning still sends.
        if (! $rooms->isOn(HistoryServiceProvider::SLUG)) {
            return Command::SUCCESS;
        }

        $today = Region::today();
        $members = $household->members();
        $birthdays = $members
            ->filter(fn (User $member): bool => $member->birthday !== null && OnThisDay::comesRoundOn($member->birthday, $today))
            ->values();
        $memories = OnThisDay::query($today)->with('birthdayOf')->get();

        // Nothing to say claims nothing, so a memory of this day added mid-morning still goes out
        // on the next hour.
        if ($birthdays->isEmpty() && $memories->isEmpty()) {
            return Command::SUCCESS;
        }

        if (! $this->claim($today)) {
            return Command::SUCCESS;
        }

        $url = $memories->count() === 1
            ? RequestedMoment::url($memories->first()->id)
            : route('apps.our-history.timeline', [], false);
        $memoriesLine = self::memoriesLine($memories);

        foreach ($members->filter(fn (User $member): bool => $member->morning_memories) as $recipient) {
            $lines = $birthdays->map(fn (User $member): string => self::birthdayLine($member, $recipient, $today));

            $body = $lines->push($memoriesLine)->filter()->implode(' ');

            $push->toUsers([$recipient], HistoryServiceProvider::SLUG, self::TAG, $body, $url);
        }

        return Command::SUCCESS;
    }

    /** The unique day is the lock: a second run, or a second server, inserts nothing. */
    private function claim(CarbonImmutable $today): bool
    {
        return DigestClaim::query()->insertOrIgnore([
            'day' => $today->toDateString(),
            'claimed_at' => now(),
        ]) === 1;
    }

    private static function birthdayLine(User $member, User $recipient, CarbonImmutable $today): string
    {
        $age = $today->year - $member->birthday->year;

        return $member->is($recipient)
            ? "Happy birthday, {$member->firstName()}! {$age} today."
            : "It's {$member->firstName()}'s birthday: {$age} today.";
    }

    /** @param  Collection<int, Event>  $memories */
    private static function memoriesLine(Collection $memories): ?string
    {
        if ($memories->isEmpty()) {
            return null;
        }

        if ($memories->count() === 1) {
            /** @var Event $memory */
            $memory = $memories->first();
            $title = Str::limit(trim((string) $memory->title), self::TITLE_LIMIT);

            if ($memory->birthdayOf !== null) {
                $when = "{$memory->birthdayOf->firstName()}'s birthday, {$memory->occurred_on->year}";

                return $title === '' ? "A memory from {$when}." : "{$when}: {$title}";
            }

            return $title === ''
                ? "A memory from this day in {$memory->occurred_on->year}."
                : "On this day in {$memory->occurred_on->year}: {$title}";
        }

        $line = "{$memories->count()} memories from this day";
        /** @var Event|null $birthday */
        $birthday = $memories->first(fn (Event $memory): bool => $memory->birthdayOf !== null);

        return $birthday?->birthdayOf === null
            ? "{$line}."
            : "{$line}, among them {$birthday->birthdayOf->firstName()}'s birthday, {$birthday->occurred_on->year}.";
    }
}
