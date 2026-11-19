<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class UsersPictureTest extends TestCase
{
    use RefreshDatabase;

    private Filesystem $disk;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->disk = Storage::fake(config('shell.media_disk'));
    }

    public function test_an_admin_removes_someone_elses_picture(): void
    {
        $this->disk->put('avatars/ravi.webp', 'ravi');
        $admin = User::factory()->admin()->create();
        $ravi = User::factory()->withAvatar('avatars/ravi.webp')->create(['name' => 'Ravi']);

        $this->actingAs($admin)
            ->delete(route('admin.users.picture.destroy', ['user' => $ravi->id]))
            ->assertRedirect(route('admin.users.edit', ['user' => $ravi->id]))
            ->assertSessionHasNoErrors();

        $this->assertNull($ravi->fresh()->avatar_key);
        $this->disk->assertMissing('avatars/ravi.webp');
    }

    public function test_a_person_cannot_remove_someone_elses_picture(): void
    {
        $this->disk->put('avatars/meera.webp', 'meera');
        $ravi = User::factory()->create();
        $meera = User::factory()->withAvatar('avatars/meera.webp')->create();

        $this->actingAs($ravi)
            ->delete(route('admin.users.picture.destroy', ['user' => $meera->id]))
            ->assertForbidden();

        $this->assertSame('avatars/meera.webp', $meera->fresh()->avatar_key);
        $this->disk->assertExists('avatars/meera.webp');
    }

    public function test_there_is_no_way_for_an_admin_to_set_someone_elses_picture(): void
    {
        $admin = User::factory()->admin()->create();
        $ravi = User::factory()->create();

        $adminPictureRoutes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route): bool => str_starts_with((string) $route->getName(), 'admin.')
                && str_contains($route->uri(), 'picture'))
            ->map(fn ($route): array => $route->methods())
            ->flatten()
            ->reject(fn (string $method): bool => $method === 'HEAD')
            ->unique()
            ->values()
            ->all();

        $this->assertSame(['DELETE'], $adminPictureRoutes);

        // The upload route only ever changes the signed-in person's own picture.
        $this->actingAs($admin)
            ->post(route('settings.profile.picture.update'), [
                'picture' => UploadedFile::fake()->image('face.jpg', 200, 200),
                'user_id' => $ravi->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertNull($ravi->fresh()->avatar_key);
        $this->assertNotNull($admin->fresh()->avatar_key);
    }

    public function test_the_edit_page_sends_the_person_their_birthday_and_roles(): void
    {
        $this->disk->put('avatars/ravi.webp', 'ravi');
        $admin = User::factory()->admin()->create();
        $ravi = User::factory()->withAvatar('avatars/ravi.webp')->create([
            'name' => 'Ravi Rao',
            'email' => 'ravi@example.test',
            'birthday' => '1990-07-02',
        ])->assignRole('user');

        $this->actingAs($admin)
            ->get(route('admin.users.edit', ['user' => $ravi->id]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Admin/UsersEdit')
                ->has('user', fn (AssertableInertia $u) => $u
                    ->where('id', $ravi->id)
                    ->where('name', 'Ravi Rao')
                    ->where('email', 'ravi@example.test')
                    ->where('birthday', '1990-07-02')
                    ->where('roles', ['user'])
                    ->where('avatar_url', fn (?string $url) => $url !== null && str_contains($url, 'avatars/ravi.webp'))
                )
            );
    }

    public function test_the_people_list_sends_each_picture(): void
    {
        $this->disk->put('avatars/meera.webp', 'meera');
        $admin = User::factory()->admin()->create(['name' => 'Asha']);
        User::factory()->withAvatar('avatars/meera.webp')->create(['name' => 'Meera']);

        $this->actingAs($admin)
            ->get(route('admin.users.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('users.data.0.name', 'Asha')
                ->where('users.data.0.avatar_url', null)
                ->where('users.data.1.name', 'Meera')
                ->where('users.data.1.avatar_url', fn (?string $url) => $url !== null && str_contains($url, 'avatars/meera.webp'))
                ->has('users.data.1', fn (AssertableInertia $row) => $row
                    ->hasAll(['id', 'name', 'avatar_url', 'email', 'last_login_at', 'roles'])
                )
            );
    }

    public function test_the_send_notification_page_lists_people_with_their_pictures(): void
    {
        $this->disk->put('avatars/meera.webp', 'meera');
        $admin = User::factory()->admin()->create(['name' => 'Asha', 'email' => 'admin@example.test']);
        $meera = User::factory()->withAvatar('avatars/meera.webp')->create(['name' => 'Meera', 'email' => 'meera@example.test']);

        $this->actingAs($admin)
            ->get(route('admin.notifications.show'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Admin/NotificationsSend')
                ->has('users', 2)
                ->where('users.0', ['id' => $admin->id, 'name' => 'Asha', 'avatar_url' => null, 'email' => 'admin@example.test'])
                ->has('users.1', fn (AssertableInertia $u) => $u
                    ->where('id', $meera->id)
                    ->where('name', 'Meera')
                    ->where('email', 'meera@example.test')
                    ->where('avatar_url', fn (?string $url) => $url !== null && str_contains($url, 'avatars/meera.webp'))
                )
            );
    }
}
