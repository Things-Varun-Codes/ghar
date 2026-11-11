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
        $previews = [];

        foreach ($slugs as $slug) {
            if (! isset($this->previewResolvers[$slug])) {
                continue;
            }

            try {
                $preview = ($this->previewResolvers[$slug])($user);
            } catch (\Throwable $e) {
                report($e);

                continue;
            }

            if (is_array($preview) && $preview !== []) {
                $previews[$slug] = $preview;
            }
        }

        return $previews;
    }

    /**
     * @param  list<string>  $slugs
     * @return array<string, string>
     */
    public function forUser(User $user, array $slugs): array
    {
        $lines = [];

        foreach ($slugs as $slug) {
            if (! isset($this->resolvers[$slug])) {
                continue;
            }

            try {
                $line = ($this->resolvers[$slug])($user);
            } catch (\Throwable $e) {
                report($e);

                continue;
            }

            if (is_string($line) && $line !== '') {
                $lines[$slug] = $line;
            }
        }

        return $lines;
    }
}
