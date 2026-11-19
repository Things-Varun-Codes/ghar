<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PersonPresenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_person_without_a_picture_has_a_null_avatar_url(): void
    {
        $user = User::factory()->create(['name' => 'Kabir Rao']);

        $this->assertSame(
            ['id' => $user->id, 'name' => 'Kabir Rao', 'avatar_url' => null],
            Person::of($user),
        );
    }

    public function test_a_picture_is_a_signed_url_for_its_key_that_holds_for_the_window(): void
    {
        config(['shell.media_disk' => 'local']);
        Storage::fake('local', ['serve' => true]);
        Storage::disk('local')->put('avatars/ravi.jpg', 'jpeg');
        $user = User::factory()->withAvatar('avatars/ravi.jpg')->create();

        $url = Person::of($user)['avatar_url'];

        $this->assertIsString($url);
        $this->assertStringContainsString('avatars/ravi.jpg', (string) $url);

        $this->travel(5)->minutes();
        $this->app->forgetScopedInstances();

        $this->assertSame($url, Person::of($user)['avatar_url']);
    }

    public function test_the_key_is_not_mass_assignable_but_the_profile_is(): void
    {
        $user = User::factory()->create();
        $user->fill(['birthday' => '1990-07-02', 'morning_memories' => false])->save();

        $user->refresh();
        $this->assertSame('1990-07-02', $user->birthday?->toDateString());
        $this->assertFalse($user->morning_memories);

        $this->expectException(MassAssignmentException::class);
        $user->fill(['avatar_key' => 'avatars/someone-else.jpg']);
    }

    public function test_household_options_send_people(): void
    {
        $me = User::factory()->create(['name' => 'Meera']);
        $other = User::factory()->create(['name' => 'Kabir']);

        $this->assertSame(
            [['id' => $other->id, 'name' => 'Kabir', 'avatar_url' => null]],
            app(Household::class)->optionsFor($me),
        );
    }

    public function test_the_signed_in_person_is_shared_with_their_picture(): void
    {
        $user = User::factory()->create(['name' => 'Asha Rao']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.user.id', $user->id)
                ->where('auth.user.name', 'Asha Rao')
                ->where('auth.user.avatar_url', null));
    }
}
