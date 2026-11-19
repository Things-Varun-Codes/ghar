<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use App\Shell\Support\Region;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BirthdayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function birthdayOf(User $user): ?string
    {
        return User::findOrFail($user->id)->birthday?->toDateString();
    }

    /** @param  array<string, mixed>  $data */
    private function saveProfile(User $user, array $data): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($user)
            ->from(route('settings.profile.show'))
            ->patch(route('settings.profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                ...$data,
            ]);
    }

    public function test_a_person_sets_their_own_birthday(): void
    {
        $user = User::factory()->create();

        $this->saveProfile($user, ['birthday' => '1990-07-02'])->assertSessionHasNoErrors();

        $this->assertSame('1990-07-02', $this->birthdayOf($user));
    }

    public function test_the_field_may_stay_empty_until_one_is_set(): void
    {
        $user = User::factory()->create();

        $this->saveProfile($user, ['birthday' => ''])->assertSessionHasNoErrors();
        $this->saveProfile($user, [])->assertSessionHasNoErrors();

        $this->assertNull($this->birthdayOf($user));
    }

    public function test_once_set_it_can_change_but_not_be_cleared(): void
    {
        $user = User::factory()->create(['birthday' => '1990-07-02']);

        $this->saveProfile($user, ['birthday' => ''])->assertSessionHasErrors('birthday');
        $this->assertSame('1990-07-02', $this->birthdayOf($user));

        $this->saveProfile($user->refresh(), ['birthday' => '1991-08-03'])->assertSessionHasNoErrors();
        $this->assertSame('1991-08-03', $this->birthdayOf($user));
    }

    /** @return array<string, array{0: string}> */
    public static function partialOrWrongDates(): array
    {
        return [
            'month and year only' => ['1990-07'],
            'day and month only' => ['07-02'],
            'day first' => ['02/07/1990'],
            'not a day' => ['1990-02-30'],
            'words' => ['next tuesday'],
            'before 1900' => ['1899-12-31'],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('partialOrWrongDates')]
    public function test_only_a_whole_real_date_is_accepted(string $birthday): void
    {
        $user = User::factory()->create();

        $this->saveProfile($user, ['birthday' => $birthday])->assertSessionHasErrors('birthday');

        $this->assertNull($this->birthdayOf($user));
    }

    public function test_a_birthday_cannot_be_in_the_future(): void
    {
        $user = User::factory()->create();
        $tomorrow = Region::today()->addDay()->toDateString();

        $this->saveProfile($user, ['birthday' => $tomorrow])->assertSessionHasErrors('birthday');
        $this->saveProfile($user, ['birthday' => Region::today()->toDateString()])->assertSessionHasNoErrors();
    }

    public function test_an_admin_sets_someone_elses_birthday(): void
    {
        $admin = User::factory()->admin()->create();
        $kabir = User::factory()->create();

        $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $kabir->id]), [
                'role' => 'user',
                'birthday' => '2010-04-21',
            ])
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHasNoErrors();

        $this->assertSame('2010-04-21', $this->birthdayOf($kabir));
        $this->assertTrue($kabir->fresh()->hasRole('user'));
    }

    public function test_an_admin_sets_their_own_birthday_from_the_edit_page(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->admin()->create();

        $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $admin->id]), [
                'role' => 'admin',
                'birthday' => '1968-03-14',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('1968-03-14', $this->birthdayOf($admin));
        $this->assertTrue($admin->fresh()->hasRole('admin'));
    }

    public function test_the_admin_edit_follows_the_same_birthday_rules(): void
    {
        $admin = User::factory()->admin()->create();
        $ravi = User::factory()->create(['birthday' => '1990-07-02']);

        $this->actingAs($admin)
            ->from(route('admin.users.edit', ['user' => $ravi->id]))
            ->patch(route('admin.users.update', ['user' => $ravi->id]), ['role' => 'user', 'birthday' => '1990-07'])
            ->assertRedirect(route('admin.users.edit', ['user' => $ravi->id]))
            ->assertSessionHasErrors('birthday');

        $this->actingAs($admin)
            ->patch(route('admin.users.update', ['user' => $ravi->id]), ['role' => 'user'])
            ->assertSessionHasErrors('birthday');

        $this->assertSame('1990-07-02', $this->birthdayOf($ravi));
    }

    public function test_a_person_cannot_set_someone_elses_birthday(): void
    {
        $ravi = User::factory()->create();
        $meera = User::factory()->create();

        $this->actingAs($ravi)
            ->patch(route('admin.users.update', ['user' => $meera->id]), ['role' => 'user', 'birthday' => '1992-01-01'])
            ->assertForbidden();

        $this->assertNull($this->birthdayOf($meera));
    }
}
