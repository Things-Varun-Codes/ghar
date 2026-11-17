<?php

namespace App\Shell\Services;

use App\Shell\Support\RoomSwitches;

/**
 * Which rooms this home has. The registry in config/miniapps.php says what is installed; the
 * admin decides what is on. A room that is off keeps its data.
 *
 * A room can also offer options of its own (Mailbox's entry types), registered from its
 * provider's boot(). An option is on unless the admin turned it off, and only while its room is.
 */
class Rooms
{
    /** @var array<string, array<string, array{label: string, description: string}>> */
    private array $options = [];

    /** @return list<array<string, mixed>> */
    public function installed(): array
    {
        return collect(config('miniapps', []))
            ->filter(fn (mixed $app): bool => is_array($app) && self::validSlug($app['slug'] ?? null))
            ->values()
            ->all();
    }

    public function has(string $slug): bool
    {
        return collect($this->installed())->contains('slug', $slug);
    }

    public function isOn(string $slug): bool
    {
        return $this->has($slug) && $this->switches()->get($slug) === true;
    }

    public function set(string $slug, bool $on): void
    {
        $this->switches()->put($slug, $on);
    }

    public function turnOnAll(): void
    {
        foreach ($this->installed() as $app) {
            $this->set($app['slug'], true);
        }
    }

    public function registerOption(string $slug, string $key, string $label, string $description = ''): void
    {
        $this->options[$slug][$key] = ['label' => $label, 'description' => $description];
    }

    public function hasOption(string $slug, string $key): bool
    {
        return isset($this->options[$slug][$key]);
    }

    public function optionOn(string $slug, string $key): bool
    {
        return $this->isOn($slug)
            && $this->hasOption($slug, $key)
            && $this->switches()->get("{$slug}:{$key}") !== false;
    }

    public function setOption(string $slug, string $key, bool $on): void
    {
        $this->switches()->put("{$slug}:{$key}", $on);
    }

    /** @return list<array{slug: string, name: string, description: string, enabled: bool, options: list<array{key: string, label: string, description: string, enabled: bool}>}> */
    public function forAdmin(): array
    {
        return array_map(fn (array $app): array => [
            'slug' => $app['slug'],
            'name' => (string) ($app['name'] ?? $app['slug']),
            'description' => (string) ($app['description'] ?? ''),
            'enabled' => $this->isOn($app['slug']),
            'options' => collect($this->options[$app['slug']] ?? [])
                ->map(fn (array $option, string $key): array => [
                    'key' => $key,
                    'label' => $option['label'],
                    'description' => $option['description'],
                    'enabled' => $this->switches()->get("{$app['slug']}:{$key}") !== false,
                ])
                ->values()
                ->all(),
        ], $this->installed());
    }

    public static function validSlug(mixed $slug): bool
    {
        return is_string($slug) && preg_match('/^[a-z][a-z0-9-]*$/', $slug) === 1;
    }

    private function switches(): RoomSwitches
    {
        return app(RoomSwitches::class);
    }
}
