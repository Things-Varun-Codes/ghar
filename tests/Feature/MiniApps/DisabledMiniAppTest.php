<?php

namespace Tests\Feature\MiniApps;

use App\MiniApps\Corner\Providers\CornerServiceProvider;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\Mailbox\Providers\MailboxServiceProvider;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Database\Seeders\RoleSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DisabledMiniAppTest extends TestCase
{
    /** @var list<string>|null */
    private ?array $originalArgv = null;

    /** @return array<string, array{class-string, list<string>, list<string>, list<string>}> */
    public static function apps(): array
    {
        return [
            'our-history' => [HistoryServiceProvider::class, ['our_history_events'], ['history.event'], ['history:prune-media']],
            'our-corner' => [CornerServiceProvider::class, ['corner_songs', 'corner_places'], ['corner.song', 'corner.place'], []],
            'our-mailbox' => [MailboxServiceProvider::class, ['mailbox_messages', 'mailbox_coupons'], [], []],
        ];
    }

    public function createApplication(): Application
    {
        $app = require Application::inferBasePath().'/bootstrap/app.php';
        $slug = $this->dataName();

        if ($this->name() === 'test_route_helper_generation_still_sees_a_disabled_app') {
            $this->originalArgv = $_SERVER['argv'];
            $_SERVER['argv'] = ['artisan', 'wayfinder:generate'];
        }

        $app->afterBootstrapping(LoadConfiguration::class, function (Application $app) use ($slug): void {
            $app['config']->set('miniapps', array_map(
                fn (array $entry): array => $entry['slug'] === $slug ? ['enabled' => false] + $entry : $entry,
                $app['config']['miniapps'],
            ));
        });

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    protected function tearDown(): void
    {
        // The schema here is missing an app's tables; force the next test to rebuild.
        RefreshDatabaseState::$migrated = false;

        if ($this->originalArgv !== null) {
            $_SERVER['argv'] = $this->originalArgv;
        }

        parent::tearDown();
    }

    /**
     * @param  class-string  $provider
     * @param  list<string>  $tables
     * @param  list<string>  $linkableTypes
     * @param  list<string>  $commands
     */
    #[DataProvider('apps')]
    public function test_a_disabled_app_is_fully_off(string $provider, array $tables, array $linkableTypes, array $commands): void
    {
        $slug = $this->dataName();

        $this->artisan('migrate:fresh')->assertSuccessful();
        $this->seed(RoleSeeder::class);

        $this->assertNull($this->app->getProvider($provider));

        foreach ($tables as $table) {
            $this->assertFalse(Schema::hasTable($table), "{$table} should not be migrated.");
        }

        $this->assertTrue(Schema::hasTable('users'));

        foreach (Route::getRoutes()->getRoutes() as $route) {
            $this->assertFalse(str_starts_with($route->uri(), "apps/{$slug}"), "{$route->uri()} should not be routed.");
        }

        $this->assertSame([], array_intersect($linkableTypes, app(LinkableEntities::class)->registeredTypes()));

        foreach ($commands as $command) {
            $this->assertArrayNotHasKey($command, Artisan::all());

            foreach (app(Schedule::class)->events() as $event) {
                $this->assertStringNotContainsString($command, (string) $event->command);
            }
        }

        $this->actingAs(User::factory()->admin()->create())
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('miniApps', fn ($apps) => collect($apps)->pluck('slug')->doesntContain($slug))
                ->where('summaries', fn ($summaries) => ! collect($summaries)->has($slug))
            );

        $this->get("/apps/{$slug}")->assertNotFound();

        foreach (array_keys(self::apps()) as $other) {
            if ($other !== $slug) {
                $this->get("/apps/{$other}")->assertOk();
            }
        }
    }

    /**
     * @return array<string, array{}>
     */
    public static function slugs(): array
    {
        return array_map(fn (): array => [], self::apps());
    }

    #[DataProvider('slugs')]
    public function test_route_helper_generation_still_sees_a_disabled_app(): void
    {
        $this->assertNotEmpty(array_filter(
            Route::getRoutes()->getRoutes(),
            fn ($route): bool => str_starts_with($route->uri(), 'apps/'.$this->dataName()),
        ));
    }
}
