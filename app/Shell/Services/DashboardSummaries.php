<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Closure;

/**
 * Rooms register their Home rows here from their provider's boot(), so the shell knows nothing
 * about them. Resolvers must scope to what the viewer may see; one that throws is reported and
 * skipped.
 */
class DashboardSummaries
{
    /** @var array<string, Closure(User, CarbonImmutable): list<array<string, mixed>>> */
    private array $feedResolvers = [];

    /**
     * Home's "Needs you" and "New this week". Each entry is
     * {kind: 'needs'|'new', title, detail, at (ISO 8601), href, action, person, image}; a room
     * returns only what the viewer may see, and "new" only from other members since $since.
     *
     * @param  Closure(User, CarbonImmutable): list<array<string, mixed>>  $resolver
     */
    public function registerFeed(string $slug, Closure $resolver): void
    {
        $this->feedResolvers[$slug] = $resolver;
    }

    /**
     * @param  list<string>  $slugs
     * @return list<array<string, mixed>>
     */
    public function feedFor(User $user, array $slugs, CarbonImmutable $since): array
    {
        $feed = [];

        foreach ($slugs as $slug) {
            if (! isset($this->feedResolvers[$slug])) {
                continue;
            }

            try {
                $entries = ($this->feedResolvers[$slug])($user, $since);
            } catch (\Throwable $e) {
                report($e);

                continue;
            }

            foreach ($entries as $entry) {
                $feed[] = ['room' => $slug, ...$entry];
            }
        }

        usort($feed, fn (array $a, array $b): int => strcmp($b['at'], $a['at']));

        return $feed;
    }
}
