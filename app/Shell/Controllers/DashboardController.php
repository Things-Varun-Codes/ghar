<?php

namespace App\Shell\Controllers;

use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\Household;
use App\Shell\Support\MiniAppRegistry;
use App\Shell\Support\Person;
use App\Shell\Support\Region;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    private const BIRTHDAYS_AHEAD_DAYS = 14;

    public function index(Request $request, DashboardSummaries $summaries, Household $household): Response
    {
        $user = $request->user();

        $slugs = array_column(MiniAppRegistry::visibleFor($user), 'slug');

        $today = Region::today();

        return Inertia::render('Shell/Pages/Dashboard', [
            'summaries' => $summaries->forUser($user, $slugs),
            'previews' => $summaries->previewsFor($user, $slugs),
            // Today and the six days before it, in the household's own days.
            'feed' => $summaries->feedFor($user, $slugs, $today->subDays(6)),
            'today' => $today->toDateString(),
            'birthdays' => $this->birthdaysAhead($household, $today),
        ]);
    }

    /** @return list<array{person: array{id: int, name: string, avatar_url: string|null}, on: string, turns: int}> */
    private function birthdaysAhead(Household $household, CarbonImmutable $today): array
    {
        return $household->members()
            ->filter(fn (User $member): bool => $member->birthday !== null)
            ->map(function (User $member) use ($today): array {
                $on = fn (int $year): CarbonImmutable => $today->setDate($year, $member->birthday->month, 1)->addDays($member->birthday->day - 1);
                $next = $on($today->year)->lessThan($today) ? $on($today->year + 1) : $on($today->year);

                return [
                    'person' => Person::of($member),
                    'on' => $next->toDateString(),
                    'turns' => $next->year - $member->birthday->year,
                ];
            })
            ->filter(fn (array $b): bool => CarbonImmutable::parse($b['on'])->diffInDays($today, true) <= self::BIRTHDAYS_AHEAD_DAYS)
            ->sortBy('on')
            ->values()
            ->all();
    }
}
