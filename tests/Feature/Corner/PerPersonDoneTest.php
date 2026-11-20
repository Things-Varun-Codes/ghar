<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class PerPersonDoneTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private User $meera;

    private User $kabir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->meera = User::factory()->create(['name' => 'Meera Rao']);
        $this->kabir = User::factory()->create(['name' => 'Kabir Rao']);
    }

    private function perPersonSongs(): CornerList
    {
        $list = $this->songs();
        $list->update(['done_per_person' => true]);

        return $list;
    }

    private function toggle(User $user, Item $item): void
    {
        $this->actingAs($user)->patch("/apps/our-shelf/items/{$item->id}/toggle-done")->assertRedirect();
    }

    public function test_each_person_marks_only_their_own(): void
    {
        $list = $this->perPersonSongs();
        $song = $this->itemIn($list, $this->meera);

        $this->toggle($this->meera, $song);
        $this->toggle($this->kabir, $song);
        $this->toggle($this->kabir, $song);

        $this->assertSame([$this->meera->id], DB::table('corner_item_marks')->where('item_id', $song->id)->pluck('user_id')->all());
        $this->assertNull($song->fresh()->done_at);
    }

    public function test_done_and_its_counts_mean_done_by_the_viewer(): void
    {
        $list = $this->perPersonSongs();
        $loved = $this->itemIn($list, $this->meera);
        $this->itemIn($list, $this->meera);
        $this->toggle($this->meera, $loved);

        $this->actingAs($this->meera)
            ->get("/apps/our-shelf/{$list->slug}?filter=done")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('list.done_per_person', true)
                ->has('items.data', 1)
                ->where('items.data.0.id', $loved->id)
                ->where('items.data.0.is_done', true)
                ->where('items.data.0.done_by.0.person.name', 'Meera')
                ->where('items.counts', ['all' => 2, 'active' => 1, 'done' => 1]));

        // Kabir hasn't loved it: it's on his playlist, though he can see Meera has.
        $this->actingAs($this->kabir)
            ->get("/apps/our-shelf/{$list->slug}?filter=active")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('items.data', 2)
                ->where('items.counts.done', 0));

        $this->actingAs($this->kabir)
            ->get("/apps/our-shelf/{$list->slug}/{$loved->id}")
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('item.is_done', false)
                ->where('item.done_by.0.person.name', 'Meera'));

        $this->actingAs($this->kabir)
            ->get('/apps/our-shelf')
            ->assertInertia(fn (AssertableInertia $page) => $page->where('lists.0.done', 0));
    }

    public function test_switching_a_list_keeps_every_mark(): void
    {
        $admin = User::factory()->admin()->create();
        $list = $this->songs();
        $song = Item::factory()->done($this->meera)->create(['list_id' => $list->id, 'added_by_user_id' => $this->meera->id]);

        $settings = fn (bool $perPerson) => [
            'name' => $list->name, 'icon' => $list->icon, 'done_label' => $list->done_label,
            'todo_label' => $list->todo_label, 'done_icon' => $list->done_icon,
            'notify_on_add' => true, 'done_per_person' => $perPerson,
        ];

        $this->actingAs($admin)->patch("/apps/our-shelf/lists/{$list->id}", $settings(true))->assertSessionHasNoErrors();

        $this->assertTrue($list->fresh()->done_per_person);
        $this->assertNull($song->fresh()->done_at);
        $this->assertSame([$this->meera->id], DB::table('corner_item_marks')->where('item_id', $song->id)->pluck('user_id')->all());

        $this->toggle($this->kabir, $song);

        $this->actingAs($admin)->patch("/apps/our-shelf/lists/{$list->id}", $settings(false))->assertSessionHasNoErrors();

        $back = $song->fresh();
        $this->assertFalse($list->fresh()->done_per_person);
        $this->assertNotNull($back->done_at);
        $this->assertSame($this->meera->id, $back->done_by_user_id, 'the first to mark it keeps it');
        $this->assertSame(0, DB::table('corner_item_marks')->count());
    }

    public function test_a_save_without_the_setting_leaves_it_alone(): void
    {
        $admin = User::factory()->admin()->create();
        $list = $this->perPersonSongs();

        $this->actingAs($admin)->patch("/apps/our-shelf/lists/{$list->id}", [
            'name' => 'Tunes', 'icon' => $list->icon, 'done_label' => $list->done_label,
            'todo_label' => $list->todo_label, 'done_icon' => $list->done_icon, 'notify_on_add' => true,
        ])->assertSessionHasNoErrors();

        $this->assertTrue($list->fresh()->done_per_person);
    }
}
