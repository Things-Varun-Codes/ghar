<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Closure;

/**
 * Mini apps register their door content here from their provider's boot(), so the shell
 * knows nothing about them. Resolvers must scope to what the viewer may see; one that throws
 * is reported and skipped.
 */
class DashboardSummaries
{
    /** @var array<string, Closure(User): ?string> */
    private array $resolvers = [];

    /** @var array<string, Closure(User): ?array> */
    private array $previewResolvers = [];

    /** @var array<string, Closure(User, CarbonImmutable): list<array<string, mixed>>> */
    private array $feedResolvers = [];

    /** @param  Closure(User): ?string  $resolver */
    public function register(string $slug, Closure $resolver): void
    {
        $this->resolvers[$slug] = $resolver;
    }

    public function registerPreview(string $slug, Closure $resolver): void
    {
        $this->previewResolvers[$slug] = $resolver;
    }

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
        $byRoom = $this->resolve(
            array_map(fn (Closure $resolver): Closure => fn (User $u): mixed => $resolver($u, $since), $this->feedResolvers),
            $user,
            $slugs,
            fn (mixed $entries): bool => is_array($entries) && $entries !== [],
        );

        $feed = [];

        foreach ($byRoom as $slug => $entries) {
            foreach ($entries as $entry) {
                $feed[] = ['room' => $slug, ...$entry];
            }
        }

        usort($feed, fn (array $a, array $b): int => strcmp($b['at'], $a['at']));

        return $feed;
    }

    /**
     * @param  list<string>  $slugs
     * @return array<string, array>
     */
    public function previewsFor(User $user, array $slugs): array
    {
        /** @var array<string, array> */
        return $this->resolve(
            $this->previewResolvers,
            $user,
            $slugs,
            fn (mixed $preview): bool => is_array($preview) && $preview !== [],
        );
    }

    /**
     * @param  list<string>  $slugs
     * @return array<string, string>
     */
    public function forUser(User $user, array $slugs): array
    {
        /** @var array<string, string> */
        return $this->resolve(
            $this->resolvers,
            $user,
            $slugs,
            fn (mixed $line): bool => is_string($line) && $line !== '',
        );
    }

    /**
     * @param  array<string, Closure(User): mixed>  $resolvers
     * @param  list<string>  $slugs
     * @param  Closure(mixed): bool  $keep
     * @return array<string, mixed>
     */
    private function resolve(array $resolvers, User $user, array $slugs, Closure $keep): array
    {
        $results = [];

        foreach ($slugs as $slug) {
            if (! isset($resolvers[$slug])) {
                continue;
            }

            try {
                $result = ($resolvers[$slug])($user);
            } catch (\Throwable $e) {
                report($e);

                continue;
            }

            if ($keep($result)) {
                $results[$slug] = $result;
            }
        }

        return $results;
    }
}
