<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ProfilePictureTest extends TestCase
{
    use RefreshDatabase;

    private Filesystem $disk;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->disk = Storage::fake(config('shell.media_disk'));
    }

    public function test_an_upload_is_stored_as_a_square_webp_on_the_media_disk(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('settings.profile.picture.update'), [
                'picture' => UploadedFile::fake()->image('me.jpg', 900, 600),
            ])
            ->assertRedirect(route('settings.profile.show'))
            ->assertSessionHasNoErrors();

        $key = $user->fresh()->avatar_key;
        $this->assertNotNull($key);
        $this->assertStringStartsWith('avatars/', $key);
        $this->assertStringEndsWith('.webp', $key);
        $this->disk->assertExists($key);

        $size = getimagesizefromstring($this->disk->get($key));
        $this->assertNotFalse($size);
        $this->assertSame([512, 512, 'image/webp'], [$size[0], $size[1], $size['mime']]);
    }

    public function test_a_new_picture_replaces_and_deletes_the_old_one(): void
    {
        $this->disk->put('avatars/old.webp', 'old');
        $user = User::factory()->withAvatar('avatars/old.webp')->create();

        $this->actingAs($user)
            ->post(route('settings.profile.picture.update'), [
                'picture' => UploadedFile::fake()->image('new.png', 300, 300),
            ])
            ->assertSessionHasNoErrors();

        $key = $user->fresh()->avatar_key;
        $this->assertNotSame('avatars/old.webp', $key);
        $this->disk->assertExists($key);
        $this->disk->assertMissing('avatars/old.webp');
    }

    public function test_removing_clears_the_key_and_deletes_the_object(): void
    {
        $this->disk->put('avatars/me.webp', 'me');
        $user = User::factory()->withAvatar('avatars/me.webp')->create();

        $this->actingAs($user)
            ->delete(route('settings.profile.picture.destroy'))
            ->assertRedirect(route('settings.profile.show'));

        $this->assertNull($user->fresh()->avatar_key);
        $this->disk->assertMissing('avatars/me.webp');
    }

    public function test_removing_without_a_picture_is_harmless(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('settings.profile.picture.destroy'))
            ->assertRedirect(route('settings.profile.show'))
            ->assertSessionHasNoErrors();

        $this->assertNull($user->fresh()->avatar_key);
    }

    /** @return array<string, array{0: callable(): UploadedFile}> */
    public static function rejectedUploads(): array
    {
        return [
            'not an image' => [fn () => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf')],
            'svg' => [fn () => UploadedFile::fake()->createWithContent('face.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')],
            'gif' => [fn () => UploadedFile::fake()->image('face.gif', 200, 200)],
            'too small' => [fn () => UploadedFile::fake()->image('tiny.png', 32, 32)],
            'too big' => [fn () => UploadedFile::fake()->image('huge.jpg', 600, 600)->size(10241)],
        ];
    }

    /** @param  callable(): UploadedFile  $upload */
    #[\PHPUnit\Framework\Attributes\DataProvider('rejectedUploads')]
    public function test_an_upload_that_is_not_a_usable_picture_is_refused(callable $upload): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('settings.profile.show'))
            ->post(route('settings.profile.picture.update'), ['picture' => $upload()])
            ->assertRedirect(route('settings.profile.show'))
            ->assertSessionHasErrors('picture');

        $this->assertNull($user->fresh()->avatar_key);
        $this->assertSame([], $this->disk->allFiles('avatars'));
    }

    public function test_a_picture_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('settings.profile.picture.update'))
            ->assertSessionHasErrors('picture');
    }

    public function test_the_key_cannot_be_set_through_the_profile_form(): void
    {
        $this->disk->put('avatars/someone-else.webp', 'theirs');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'avatar_key' => 'avatars/someone-else.webp',
            ])
            ->assertSessionHasNoErrors();

        $this->assertNull($user->fresh()->avatar_key);
    }

    public function test_guests_cannot_upload(): void
    {
        $this->post(route('settings.profile.picture.update'), [
            'picture' => UploadedFile::fake()->image('me.jpg', 200, 200),
        ])->assertRedirect(route('login'));

        $this->assertSame([], $this->disk->allFiles('avatars'));
    }

    public function test_the_profile_page_sends_the_signed_picture_and_birthday(): void
    {
        $this->disk->put('avatars/me.webp', 'me');
        $user = User::factory()->withAvatar('avatars/me.webp')->create([
            'name' => 'Meera Rao',
            'email' => 'meera@example.test',
            'birthday' => '1992-11-19',
        ]);

        $this->actingAs($user)
            ->get(route('settings.profile.show'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Shell/Pages/Settings/Profile')
                ->has('user', fn (AssertableInertia $u) => $u
                    ->where('id', $user->id)
                    ->where('name', 'Meera Rao')
                    ->where('email', 'meera@example.test')
                    ->where('birthday', '1992-11-19')
                    ->where('avatar_url', fn (?string $url) => $url !== null && str_contains($url, 'avatars/me.webp'))
                )
            );
    }

    public function test_deleting_a_former_member_for_good_deletes_their_picture(): void
    {
        $this->disk->put('avatars/gone.webp', 'gone');
        $admin = User::factory()->admin()->create();
        $user = User::factory()->former()->withAvatar('avatars/gone.webp')->create();

        $this->actingAs($admin)
            ->delete(route('admin.users.destroy', ['user' => $user->id]))
            ->assertSessionHasNoErrors();

        $this->assertModelMissing($user);
        $this->disk->assertMissing('avatars/gone.webp');
    }
}
