<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Actions\CreateList;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Support\SessionKey;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class CornerListsTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private User $creator;

    private User $member;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->creator = User::factory()->create();
        $this->member = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Board games',
            'icon' => 'dices',
            'done_label' => 'Played',
            'todo_label' => 'To play',
            'done_icon' => 'check',
            'notify_on_add' => true,
        ];
    }

    private function listBy(User $creator, array $attributes = []): CornerList
    {
        return CornerList::factory()->create(['created_by_user_id' => $creator->id] + $attributes);
    }

    // Creating

    public function test_any_member_makes_a_list_at_the_end_of_the_shelf(): void
    {
        $this->songs();
        $this->movies();

        $this->actingAs($this->member)
            ->post('/apps/our-shelf/lists', $this->payload(['name' => '  Board   games ', 'icon' => 'dices', 'notify_on_add' => false, 'done_icon' => 'heart']))
            ->assertRedirect('/apps/our-shelf/board-games')
            ->assertSessionHas(SessionKey::FLASH_DATA, ['toast' => ['type' => 'success', 'message' => 'Made Board games.']]);

        $list = CornerList::query()->where('slug', 'board-games')->sole();
        $this->assertSame('Board games', $list->name);
        $this->assertSame('dices', $list->icon);
        $this->assertSame('Played', $list->done_label);
        $this->assertSame('To play', $list->todo_label);
        $this->assertSame('heart', $list->done_icon);
        $this->assertFalse($list->notify_on_add);
        $this->assertSame($this->member->id, $list->created_by_user_id);
        $this->assertSame(2, $list->position);

        $this->actingAs($this->member)
            ->get('/apps/our-shelf/board-games')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/Corner/Pages/List')
                ->where('list.slug', 'board-games')
                ->has('items.data', 0));
    }

    public function test_the_first_list_on_an_empty_shelf_takes_the_first_place(): void
    {
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload())->assertSessionHasNoErrors();

        $this->assertSame(0, CornerList::query()->sole()->position);
    }

    /** @return array<string, array{0: string, 1: string}> */
    public static function names(): array
    {
        return [
            'words' => ['Board Games!', 'board-games'],
            'accents' => ['Cafés à Paris', 'cafes-a-paris'],
            'no latin letters' => ['本', 'list'],
            'only punctuation' => ['!!!', 'list'],
            'reserved lists' => ['Lists', 'lists-list'],
            'reserved items' => ['ITEMS', 'items-list'],
            'long' => [str_repeat('Long name ', 6), rtrim(substr(str_repeat('long-name-', 6), 0, 59), '-')],
        ];
    }

    #[DataProvider('names')]
    public function test_a_slug_is_made_from_the_name(string $name, string $slug): void
    {
        $this->assertSame($slug, app(CreateList::class)->slugFor($name));
    }

    public function test_a_slug_never_runs_past_seventy_characters(): void
    {
        $slug = app(CreateList::class)->slugFor(str_repeat('abcdefghij ', 10));

        $this->assertLessThanOrEqual(70, strlen($slug));
        $this->assertStringEndsNotWith('-', $slug);
    }

    public function test_a_taken_slug_gets_the_next_free_number(): void
    {
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Books']))->assertRedirect('/apps/our-shelf/books');
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Books']))->assertRedirect('/apps/our-shelf/books-2');
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'books!']))->assertRedirect('/apps/our-shelf/books-3');

        // A list whose own name ends in a number doesn't confuse the count.
        CornerList::query()->where('slug', 'books-2')->delete();
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Books']))->assertRedirect('/apps/our-shelf/books-2');

        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Lists']))->assertRedirect('/apps/our-shelf/lists-list');
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Lists']))->assertRedirect('/apps/our-shelf/lists-list-2');

        $this->assertSame(
            ['books', 'books-2', 'books-3', 'lists-list', 'lists-list-2'],
            CornerList::query()->orderBy('slug')->pluck('slug')->all(),
        );
    }

    public function test_a_list_named_like_an_existing_slug_prefix_is_not_numbered(): void
    {
        $this->listBy($this->creator, ['slug' => 'books-for-kids']);

        $this->assertSame('books', app(CreateList::class)->slugFor('Books'));
    }

    public function test_a_list_whose_slug_is_reserved_still_works_at_its_address(): void
    {
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload(['name' => 'Items']))->assertRedirect('/apps/our-shelf/items-list');

        $this->actingAs($this->member)
            ->post('/apps/our-shelf/items-list', ['title' => 'A thing'])
            ->assertRedirect('/apps/our-shelf/items-list');

        $this->assertSame(1, CornerList::query()->where('slug', 'items-list')->sole()->items()->count());
    }

    /** @return array<string, array{0: array<string, mixed>, 1: string}> */
    public static function invalid(): array
    {
        return [
            'no name' => [['name' => '   '], 'name'],
            'name too long' => [['name' => str_repeat('a', 61)], 'name'],
            'no icon' => [['icon' => ''], 'icon'],
            'unknown icon' => [['icon' => 'not-an-icon'], 'icon'],
            'icon not a string' => [['icon' => ['music']], 'icon'],
            'no done word' => [['done_label' => ''], 'done_label'],
            'done word too long' => [['done_label' => str_repeat('a', 25)], 'done_label'],
            'no not-yet word' => [['todo_label' => ''], 'todo_label'],
            'unknown done icon' => [['done_icon' => 'star'], 'done_icon'],
            'notify not a boolean' => [['notify_on_add' => 'sometimes'], 'notify_on_add'],
            'notify missing' => [['notify_on_add' => null], 'notify_on_add'],
        ];
    }

    /** @param  array<string, mixed>  $overrides */
    #[DataProvider('invalid')]
    public function test_a_list_is_validated(array $overrides, string $field): void
    {
        $this->actingAs($this->member)
            ->from('/apps/our-shelf')
            ->post('/apps/our-shelf/lists', $this->payload($overrides))
            ->assertRedirect('/apps/our-shelf')
            ->assertSessionHasErrors([$field]);

        $this->assertSame(0, CornerList::count());
    }

    public function test_created_by_and_position_cannot_be_sent(): void
    {
        $this->actingAs($this->member)->post('/apps/our-shelf/lists', $this->payload([
            'slug' => 'chosen',
            'created_by_user_id' => $this->admin->id,
            'position' => 99,
        ]))->assertSessionHasNoErrors();

        $list = CornerList::query()->sole();
        $this->assertSame('board-games', $list->slug);
        $this->assertSame($this->member->id, $list->created_by_user_id);
        $this->assertSame(0, $list->position);
    }

    // Changing

    public function test_the_creator_changes_the_settings_but_the_address_stays(): void
    {
        $list = $this->listBy($this->creator, ['name' => 'Books', 'slug' => 'books']);

        $this->actingAs($this->creator)
            ->from('/apps/our-shelf/books')
            ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload([
                'name' => 'Novels',
                'icon' => 'book',
                'done_label' => 'Read',
                'todo_label' => 'To read',
                'done_icon' => 'heart',
                'notify_on_add' => false,
                'slug' => 'novels',
            ]))
            ->assertRedirect('/apps/our-shelf/books')
            ->assertSessionHasNoErrors()
            ->assertSessionHas(SessionKey::FLASH_DATA, ['toast' => ['type' => 'success', 'message' => 'Saved.']]);

        $list->refresh();
        $this->assertSame('Novels', $list->name);
        $this->assertSame('books', $list->slug);
        $this->assertSame('book', $list->icon);
        $this->assertSame('Read', $list->done_label);
        $this->assertSame('To read', $list->todo_label);
        $this->assertSame('heart', $list->done_icon);
        $this->assertFalse($list->notify_on_add);
    }

    /** @return array<string, array{0: string, 1: string}> */
    public static function icons(): array
    {
        return [
            'a lucide name' => ['sailboat', 'sailboat'],
            'another' => ['rocket', 'rocket'],
            'an older lucide spelling' => ['music', 'music'],
        ];
    }

    #[DataProvider('icons')]
    public function test_any_lucide_icon_may_be_chosen(string $sent, string $stored): void
    {
        $list = $this->listBy($this->creator);

        $this->actingAs($this->creator)
            ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload(['icon' => $sent]))
            ->assertSessionHasNoErrors();

        $this->assertSame($stored, $list->fresh()->icon);
    }

    public function test_an_unknown_icon_is_refused_and_a_kind_is_not_a_setting(): void
    {
        $list = $this->listBy($this->creator, ['icon' => 'music']);

        $this->actingAs($this->creator)
            ->from("/apps/our-shelf/{$list->slug}")
            ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload(['icon' => 'definitely-not-lucide']))
            ->assertSessionHasErrors(['icon' => 'Choose one of the icons.']);
        $this->assertSame('music', $list->fresh()->icon);

        // A client that still sends a kind is not refused for it; it just isn't kept.
        $this->actingAs($this->creator)
            ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload(['kind' => 'link']))
            ->assertSessionHasNoErrors();
        $this->assertArrayNotHasKey('kind', $list->fresh()->getAttributes());
    }

    public function test_an_admin_changes_anyones_list_and_the_four_original_lists(): void
    {
        $mine = $this->listBy($this->creator);
        $songs = $this->songs();

        foreach ([$mine, $songs] as $list) {
            $this->actingAs($this->admin)
                ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload(['name' => 'By admin']))
                ->assertSessionHasNoErrors();

            $this->assertSame('By admin', $list->fresh()->name);
        }
    }

    public function test_nobody_else_changes_a_list(): void
    {
        $mine = $this->listBy($this->creator, ['name' => 'Mine']);
        $songs = $this->songs();

        foreach ([$mine, $songs] as $list) {
            $this->actingAs($this->member)
                ->patch("/apps/our-shelf/lists/{$list->id}", $this->payload(['name' => 'Hijacked']))
                ->assertForbidden();

            $this->assertNotSame('Hijacked', $list->fresh()->name);
        }

        // The creator of one list has no say over the four original ones.
        $this->actingAs($this->creator)
            ->patch("/apps/our-shelf/lists/{$songs->id}", $this->payload())
            ->assertForbidden();
    }

    public function test_changing_a_list_that_does_not_exist_is_a_404(): void
    {
        $this->actingAs($this->admin)
            ->patch('/apps/our-shelf/lists/999999999', $this->payload())
            ->assertNotFound();
    }

    // Reordering

    public function test_anyone_moves_a_list_earlier_or_later(): void
    {
        $a = $this->listBy($this->creator, ['position' => 0]);
        $b = $this->listBy($this->creator, ['position' => 1]);
        $c = $this->listBy($this->creator, ['position' => 2]);
        $order = fn (): array => CornerList::query()->orderBy('position')->orderBy('id')->pluck('id')->all();

        $this->actingAs($this->member)
            ->from('/apps/our-shelf')
            ->patch("/apps/our-shelf/lists/{$c->id}/move", ['direction' => 'up'])
            ->assertRedirect('/apps/our-shelf');
        $this->assertSame([$a->id, $c->id, $b->id], $order());

        $this->actingAs($this->member)->patch("/apps/our-shelf/lists/{$a->id}/move", ['direction' => 'down']);
        $this->assertSame([$c->id, $a->id, $b->id], $order());

        // Past either end is a no-op.
        $this->actingAs($this->member)->patch("/apps/our-shelf/lists/{$c->id}/move", ['direction' => 'up'])->assertSessionHasNoErrors();
        $this->actingAs($this->member)->patch("/apps/our-shelf/lists/{$b->id}/move", ['direction' => 'down'])->assertSessionHasNoErrors();
        $this->assertSame([$c->id, $a->id, $b->id], $order());
        $this->assertSame([0, 1, 2], CornerList::query()->orderBy('position')->pluck('position')->all());
    }

    public function test_moving_renumbers_a_shelf_with_ties_and_gaps(): void
    {
        $a = $this->listBy($this->creator, ['position' => 5]);
        $b = $this->listBy($this->creator, ['position' => 5]);
        $c = $this->listBy($this->creator, ['position' => 40]);

        $this->actingAs($this->member)->patch("/apps/our-shelf/lists/{$b->id}/move", ['direction' => 'up']);

        $this->assertSame(
            [$b->id => 0, $a->id => 1, $c->id => 2],
            CornerList::query()->orderBy('position')->pluck('position', 'id')->all(),
        );
    }

    public function test_the_landing_shows_lists_in_shelf_order(): void
    {
        $a = $this->listBy($this->creator, ['position' => 1]);
        $b = $this->listBy($this->creator, ['position' => 0]);

        $this->actingAs($this->member)->patch("/apps/our-shelf/lists/{$a->id}/move", ['direction' => 'up']);

        $this->actingAs($this->member)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('lists.0.id', $a->id)
                ->where('lists.1.id', $b->id));
    }

    public function test_a_move_needs_a_direction(): void
    {
        $list = $this->listBy($this->creator);

        foreach ([[], ['direction' => 'sideways']] as $payload) {
            $this->actingAs($this->member)
                ->from('/apps/our-shelf')
                ->patch("/apps/our-shelf/lists/{$list->id}/move", $payload)
                ->assertSessionHasErrors(['direction']);
        }

        $this->actingAs($this->member)->patch('/apps/our-shelf/lists/999999999/move', ['direction' => 'up'])->assertNotFound();
    }

    // Deleting

    public function test_the_creator_deletes_a_list_that_only_holds_their_own_items(): void
    {
        $list = $this->listBy($this->creator, ['name' => 'Mine']);
        $item = $this->itemIn($list, $this->creator);

        $this->actingAs($this->creator)
            ->from("/apps/our-shelf/{$list->slug}")
            ->delete("/apps/our-shelf/lists/{$list->id}")
            ->assertRedirect('/apps/our-shelf')
            ->assertSessionHas(SessionKey::FLASH_DATA, ['toast' => ['type' => 'success', 'message' => 'Deleted Mine.']]);

        $this->assertModelMissing($list);
        $this->assertModelMissing($item);
    }

    public function test_the_creator_cannot_delete_once_someone_else_has_added_to_it(): void
    {
        $list = $this->listBy($this->creator);
        $this->itemIn($list, $this->creator);
        $theirs = $this->itemIn($list, $this->member);

        $this->actingAs($this->creator)->delete("/apps/our-shelf/lists/{$list->id}")->assertForbidden();
        $this->assertModelExists($list);

        // Once that item is gone it's theirs to delete again.
        $theirs->delete();
        $this->actingAs($this->creator)->delete("/apps/our-shelf/lists/{$list->id}")->assertRedirect('/apps/our-shelf');
        $this->assertModelMissing($list);
    }

    public function test_an_admin_deletes_any_list_and_everything_in_it(): void
    {
        $list = $this->listBy($this->creator);
        $this->itemIn($list, $this->creator);
        $this->itemIn($list, $this->member);
        $songs = $this->songs();
        $this->itemIn($songs, $this->member);
        $keep = $this->itemIn($this->movies(), $this->member);

        $this->actingAs($this->admin)->delete("/apps/our-shelf/lists/{$list->id}")->assertRedirect('/apps/our-shelf');
        $this->actingAs($this->admin)->delete("/apps/our-shelf/lists/{$songs->id}")->assertRedirect('/apps/our-shelf');

        $this->assertModelMissing($list);
        $this->assertModelMissing($songs);
        $this->assertSame([$keep->id], Item::query()->pluck('id')->all());
    }

    public function test_nobody_else_deletes_a_list_even_an_empty_one(): void
    {
        $empty = $this->listBy($this->creator);
        $songs = $this->songs();

        foreach ([$empty, $songs] as $list) {
            $this->actingAs($this->member)->delete("/apps/our-shelf/lists/{$list->id}")->assertForbidden();
            $this->assertModelExists($list);
        }
    }

    public function test_a_list_whose_creator_has_left_is_left_to_an_admin(): void
    {
        $leaver = User::factory()->create();
        $list = $this->listBy($leaver);
        $leaver->delete();

        $this->assertNull($list->fresh()->created_by_user_id);
        $this->actingAs($this->member)->delete("/apps/our-shelf/lists/{$list->id}")->assertForbidden();
        $this->actingAs($this->admin)->delete("/apps/our-shelf/lists/{$list->id}")->assertRedirect('/apps/our-shelf');
    }

    // What the pages tell each viewer

    public function test_the_list_page_says_who_may_change_and_delete_it(): void
    {
        $list = $this->listBy($this->creator);
        $this->itemIn($list, $this->creator);

        $can = fn (User $viewer) => $this->actingAs($viewer)->get("/apps/our-shelf/{$list->slug}");

        $can($this->creator)->assertInertia(fn (AssertableInertia $page) => $page
            ->where('list.can', ['update' => true, 'delete' => true])
            ->where('list.delete_needs_admin', false));
        $can($this->member)->assertInertia(fn (AssertableInertia $page) => $page
            ->where('list.can', ['update' => false, 'delete' => false])
            ->where('list.delete_needs_admin', false));
        $can($this->admin)->assertInertia(fn (AssertableInertia $page) => $page
            ->where('list.can', ['update' => true, 'delete' => true])
            ->where('list.delete_needs_admin', false));

        $this->itemIn($list, $this->member);

        $can($this->creator)->assertInertia(fn (AssertableInertia $page) => $page
            ->where('list.can', ['update' => true, 'delete' => false])
            ->where('list.delete_needs_admin', true));
        $can($this->admin)->assertInertia(fn (AssertableInertia $page) => $page
            ->where('list.can', ['update' => true, 'delete' => true])
            ->where('list.delete_needs_admin', false));
    }

    public function test_the_item_page_and_the_landing_carry_the_same_flags(): void
    {
        $list = $this->listBy($this->creator);
        $this->itemIn($list, $this->creator);
        $item = $this->itemIn($list, $this->member);

        $this->actingAs($this->creator)
            ->get("/apps/our-shelf/{$list->slug}/{$item->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('list.can', ['update' => true, 'delete' => false])
                ->where('list.delete_needs_admin', true));

        $this->actingAs($this->creator)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('can.create', true)
                ->where('lists.0.id', $list->id)
                ->where('lists.0.can', ['update' => true, 'delete' => false])
                ->where('lists.0.delete_needs_admin', true));

        $this->actingAs($this->member)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('can.create', true)
                ->where('lists.0.can', ['update' => false, 'delete' => false])
                ->where('lists.0.delete_needs_admin', false));
    }
}
