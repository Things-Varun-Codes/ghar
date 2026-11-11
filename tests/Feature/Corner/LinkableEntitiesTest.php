<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LinkableEntitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_register_an_entity_type(): void
    {
        $linkable = app(LinkableEntities::class);
        $linkable->register(
            'foo.bar',
            listing: fn (string $q, int $limit) => [
                ['id' => 1, 'title' => 'Foo One', 'thumbnail_url' => null],
                ['id' => 2, 'title' => 'Foo Two', 'thumbnail_url' => null],
            ],
            resolve: fn (int $id) => ['id' => $id, 'title' => "Foo {$id}"],
        );

        $results = $linkable->search('q', ['foo.bar']);

        $this->assertCount(2, $results);
        $this->assertSame('foo.bar', $results[0]['type']);
        $this->assertSame('Foo One', $results[0]['title']);
    }

    public function test_search_returns_empty_for_unknown_type(): void
    {
        $linkable = app(LinkableEntities::class);

        $this->assertSame([], $linkable->search('anything', ['unknown.type']));
    }

    public function test_search_respects_limit(): void
    {
        $linkable = app(LinkableEntities::class);

        // Register a listing closure that returns 30 fake entities; the  service must cap at
        // the default limit (20).
        $linkable->register(
            'big.set',
            listing: fn (string $q, int $limit) => array_map(
                fn (int $i) => ['id' => $i, 'title' => "Item {$i}", 'thumbnail_url' => null],
                range(1, 30),
            ),
            resolve: fn (int $id) => ['id' => $id, 'title' => "Item {$id}"],
        );

        $results = $linkable->search('q', ['big.set']);

        $this->assertCount(20, $results);

        // Explicit limit override also respected.
        $this->assertCount(5, $linkable->search('q', ['big.set'], limit: 5));
    }

    public function test_resolve_returns_null_for_unknown_type(): void
    {
        $linkable = app(LinkableEntities::class);

        $this->assertNull($linkable->resolve('unknown', 1));
    }

    public function test_resolve_invokes_resolve_closure(): void
    {
        $linkable = app(LinkableEntities::class);
        $linkable->register(
            'foo.bar',
            listing: fn () => [],
            resolve: fn (int $id) => ['id' => $id, 'title' => "Foo {$id}", 'href' => "/foo/{$id}"],
        );

        $resolved = $linkable->resolve('foo.bar', 42);

        $this->assertSame(['id' => 42, 'title' => 'Foo 42', 'href' => '/foo/42'], $resolved);
    }

    public function test_record_reference_upserts_row(): void
    {
        $linkable = app(LinkableEntities::class);

        $linkable->recordReference('history.event', 1, 'corner.song', 7);
        $linkable->recordReference('history.event', 1, 'corner.song', 7);

        // Idempotent via unq_entity_ref unique index — second call  updates created_at but
        // does NOT insert a duplicate row.
        $this->assertSame(1, DB::table('entity_references')
            ->where('from_type', 'history.event')
            ->where('from_id', 1)
            ->where('to_type', 'corner.song')
            ->where('to_id', 7)
            ->count());
    }

    public function test_remove_reference_deletes_matching_row(): void
    {
        $linkable = app(LinkableEntities::class);

        $linkable->recordReference('history.event', 1, 'corner.song', 7);
        $linkable->recordReference('history.event', 1, 'corner.movie', 9);

        $linkable->removeReference('history.event', 1, 'corner.song', 7);

        $this->assertSame(0, DB::table('entity_references')
            ->where('to_type', 'corner.song')->where('to_id', 7)->count());
        // Non-matching tuple untouched.
        $this->assertSame(1, DB::table('entity_references')
            ->where('to_type', 'corner.movie')->where('to_id', 9)->count());
    }

    public function test_references_to_returns_back_references(): void
    {
        $linkable = app(LinkableEntities::class);
        $linkable->register(
            'history.event',
            listing: fn () => [],
            resolve: fn (int $id) => ['id' => $id, 'title' => "Event {$id}"],
        );

        $linkable->recordReference('history.event', 1, 'corner.song', 7);
        $linkable->recordReference('history.event', 2, 'corner.song', 7);

        $refs = $linkable->referencesTo('corner.song', 7);

        $this->assertCount(2, $refs);

        $ids = $refs->pluck('from_id')->all();
        sort($ids);
        $this->assertSame([1, 2], $ids);

        // Snapshots resolved via the from-entity's resolve closure.
        $snapshotTitles = $refs->pluck('snapshot.title')->sort()->values()->all();
        $this->assertSame(['Event 1', 'Event 2'], $snapshotTitles);
    }

    public function test_references_to_returns_null_snapshot_for_deleted_from_entity(): void
    {
        $linkable = app(LinkableEntities::class);
        // Resolve closure returns null for missing from-entity — graceful  degradation.
        $linkable->register(
            'history.event',
            listing: fn () => [],
            resolve: fn (int $id) => $id === 99 ? null : ['id' => $id, 'title' => "Event {$id}"],
        );

        $linkable->recordReference('history.event', 99, 'corner.song', 7);

        $refs = $linkable->referencesTo('corner.song', 7);

        $this->assertCount(1, $refs);
        $this->assertSame(99, $refs->first()['from_id']);
        $this->assertNull($refs->first()['snapshot']);
    }

    public function test_references_to_batches_resolution_by_from_type(): void
    {
        $linkable = app(LinkableEntities::class);

        foreach (['fixture.alpha', 'fixture.beta', 'fixture.gamma'] as $type) {
            $linkable->register(
                $type,
                listing: fn () => [],
                resolve: fn (int $id) => $this->fixtureResolveOne($type, $id),
                resolveMany: fn (array $ids) => $this->fixtureResolveMany($type, $ids),
            );

            $linkable->recordReference($type, 1, 'corner.song', 7);
            $linkable->recordReference($type, 2, 'corner.song', 7);
        }

        $this->expectsDatabaseQueryCount(4);

        $refs = $linkable->referencesTo('corner.song', 7);

        $this->assertCount(6, $refs);
        $this->assertSame(
            $this->fixtureExpectedTitles(['fixture.alpha', 'fixture.beta', 'fixture.gamma']),
            $refs->pluck('snapshot.title')->sort()->values()->all(),
        );
    }

    public function test_references_to_falls_back_to_per_id_resolve_when_no_batch_closure_registered(): void
    {
        $linkable = app(LinkableEntities::class);

        foreach (['fixture.alpha', 'fixture.beta', 'fixture.gamma'] as $type) {
            $linkable->register(
                $type,
                listing: fn () => [],
                resolve: fn (int $id) => $this->fixtureResolveOne($type, $id),
            );

            $linkable->recordReference($type, 1, 'corner.song', 7);
            $linkable->recordReference($type, 2, 'corner.song', 7);
        }

        $this->expectsDatabaseQueryCount(7);

        $refs = $linkable->referencesTo('corner.song', 7);

        $this->assertCount(6, $refs);
        $this->assertSame(
            $this->fixtureExpectedTitles(['fixture.alpha', 'fixture.beta', 'fixture.gamma']),
            $refs->pluck('snapshot.title')->sort()->values()->all(),
        );
    }

    private function fixtureResolveOne(string $type, int $id): array
    {
        DB::table('users')->where('id', $id)->first();

        return ['id' => $id, 'title' => "{$type} {$id}"];
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, array<string, mixed>>
     */
    private function fixtureResolveMany(string $type, array $ids): array
    {
        DB::table('users')->whereIn('id', $ids)->get();

        $result = [];
        foreach ($ids as $id) {
            $result[$id] = ['id' => $id, 'title' => "{$type} {$id}"];
        }

        return $result;
    }

    /**
     * @param  list<string>  $types
     * @return list<string>
     */
    private function fixtureExpectedTitles(array $types): array
    {
        $titles = [];
        foreach ($types as $type) {
            foreach ([1, 2] as $id) {
                $titles[] = "{$type} {$id}";
            }
        }
        sort($titles);

        return $titles;
    }

    public function test_registered_types_returns_keys(): void
    {
        $linkable = app(LinkableEntities::class);

        $baseline = $linkable->registeredTypes();

        $linkable->register('foo.bar', fn () => [], fn () => null);
        $linkable->register('baz.qux', fn () => [], fn () => null);

        $types = $linkable->registeredTypes();
        $newTypes = array_values(array_diff($types, $baseline));
        sort($newTypes);
        $this->assertSame(['baz.qux', 'foo.bar'], $newTypes);

        $linkable->register('zee.zee', fn () => [], fn () => null);
        $this->assertContains('zee.zee', $linkable->registeredTypes());
    }

    public function test_picker_search_treats_wildcards_as_literal_text(): void
    {
        $adder = User::factory()->create();
        Activity::factory()->create(['title' => '100% fun', 'added_by_user_id' => $adder->id]);
        Activity::factory()->create(['title' => '100 fun', 'added_by_user_id' => $adder->id]);

        $linkable = app(LinkableEntities::class);

        $this->assertSame(['100% fun'], array_column($linkable->search('0%', ['corner.activity']), 'title'));
        $this->assertSame([], $linkable->search('1_0', ['corner.activity']));
    }
}
