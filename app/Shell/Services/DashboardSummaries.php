<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
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
