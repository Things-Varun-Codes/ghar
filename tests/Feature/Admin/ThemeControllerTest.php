<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ThemeControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        // Pin the active theme to the test-canonical default.
        DB::table('settings')->updateOrInsert(
            ['key' => 'active_theme'],
            ['value' => 'pastel', 'updated_at' => now()],
        );
    }

    public function test_admin_can_view_theme_index(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)->get(route('admin.theme.index'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $this->assertSame('Shell/Pages/Admin/ThemeIndex', $page['component']);
    }

    public function test_non_admin_cannot_view_theme_index(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $response = $this->actingAs($user)->get('/admin/theme');

        $response->assertStatus(403);
    }

    public function test_admin_can_update_active_theme_to_valid_slug(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)->post('/admin/theme', ['theme' => 'warm']);

        $response->assertRedirect(route('admin.theme.index'));

        $current = DB::table('settings')->where('key', 'active_theme')->value('value');
        $this->assertSame('warm', $current);
    }

    public function test_update_with_invalid_slug_is_rejected_with_mapped_message(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)
            ->from('/admin/theme')
            ->post('/admin/theme', ['theme' => 'nonexistent']);

        // Validation failure redirects back with errors on the session
        $response->assertSessionHasErrors([
            'theme' => 'Theme not found. Please refresh and try again.',
        ]);

        // Proof — the row was NOT mutated by the invalid POST
        $current = DB::table('settings')->where('key', 'active_theme')->value('value');
        $this->assertSame('pastel', $current);
    }

    public function test_non_admin_cannot_update_active_theme(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $response = $this->actingAs($user)->post('/admin/theme', ['theme' => 'warm']);

        $response->assertStatus(403);

        // The row must remain at the seeded default
        $current = DB::table('settings')->where('key', 'active_theme')->value('value');
        $this->assertSame('pastel', $current);
    }
}
