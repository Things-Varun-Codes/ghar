<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Support\RoomSwitches;

/**
 * Which rooms this home has. The registry in config/miniapps.php says what is installed; the
 * admin decides what is on. A room that is off keeps its data.
 *
 * A room can also offer options of its own (Mailbox's entry types), registered from its
 * provider's boot(). An option is on unless the admin turned it off, and only while its room is.
 * One that says why it is unavailable (a setting the server lacks) is off whatever the switch says.
 */
class Rooms
{
    /** @var array<string, array<string, array{label: string, description: string, unavailable: (\Closure(): (string|null))|null}>> */
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
        return $this->entry($slug) !== null;
    }

    public function isOn(string $slug): bool
    {
        return $this->has($slug) && $this->switches()->get($slug) === true;
    }

    /** The one rule for who may use a room: it is on, and an `admin_only` room only for admins. */
    public function canEnter(?User $user, string $slug): bool
    {
        $app = $this->entry($slug);

        return $app !== null && $this->isOn($slug) && $this->admits($user, $app);
    }

    /**
     * The registry entries of the rooms this viewer may enter, in registry order.
     *
     * @return list<array<string, mixed>>
     */
    public function enterableBy(?User $user): array
    {
        return collect($this->installed())
            ->filter(fn (array $app): bool => $this->isOn($app['slug']) && $this->admits($user, $app))
            ->values()
            ->all();
    }

    public function name(string $slug): ?string
    {
        $app = $this->entry($slug);

        return $app === null ? null : (string) ($app['name'] ?? $slug);
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

    /** @param  (\Closure(): (string|null))|null  $unavailable  asked each time, so it follows the settings as they are now */
    public function registerOption(string $slug, string $key, string $label, string $description = '', ?\Closure $unavailable = null): void
    {
        $this->options[$slug][$key] = ['label' => $label, 'description' => $description, 'unavailable' => $unavailable];
    }

    public function hasOption(string $slug, string $key): bool
    {
        return isset($this->options[$slug][$key]);
    }

    public function optionOn(string $slug, string $key): bool
    {
        return $this->isOn($slug)
            && $this->optionUnavailable($slug, $key) === null
            && $this->switches()->get(self::optionKey($slug, $key)) !== false;
    }

    /** Why the option can't be turned on, or null. An unknown option is unavailable too. */
    public function optionUnavailable(string $slug, string $key): ?string
    {
        if (! $this->hasOption($slug, $key)) {
            return 'Not installed.';
        }

        $unavailable = $this->options[$slug][$key]['unavailable'];

        return $unavailable === null ? null : $unavailable();
    }

    public function optionLabel(string $slug, string $key): ?string
    {
        return $this->options[$slug][$key]['label'] ?? null;
    }

    public function setOption(string $slug, string $key, bool $on): void
    {
        $this->switches()->put(self::optionKey($slug, $key), $on);
    }

    /** @return list<array{slug: string, name: string, description: string, enabled: bool, options: list<array{key: string, label: string, description: string, enabled: bool, unavailable: string|null}>}> */
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
                    'enabled' => $this->optionUnavailable($app['slug'], $key) === null
                        && $this->switches()->get(self::optionKey($app['slug'], $key)) !== false,
                    'unavailable' => $this->optionUnavailable($app['slug'], $key),
                ])
                ->values()
                ->all(),
        ], $this->installed());
    }

    public static function validSlug(mixed $slug): bool
    {
        return is_string($slug) && preg_match('/^[a-z][a-z0-9-]*$/', $slug) === 1;
    }

    /** @return array<string, mixed>|null */
    private function entry(string $slug): ?array
    {
        return collect($this->installed())->firstWhere('slug', $slug);
    }

    /** @param  array<string, mixed>  $app */
    private function admits(?User $user, array $app): bool
    {
        if (empty($app['admin_only'])) {
            return true;
        }

        // Loaded, not lazy: push recipients come from a collection, where strict mode forbids it.
        return (bool) $user?->loadMissing('roles')->hasRole('admin');
    }

    private static function optionKey(string $slug, string $key): string
    {
        return "{$slug}:{$key}";
    }

    private function switches(): RoomSwitches
    {
        return app(RoomSwitches::class);
    }
}
