<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShortLinkTest extends TestCase
{
    use RefreshDatabase;

    private const DESTINATION = 'https://www.google.com/maps/dir/?api=1&destination=38.7223,-9.1393&travelmode=driving&dir_action=navigate';

    private const COORDINATE_FRAGMENT = '38.7223,-9.1393';

    // A different Maps URL (different coordinates) used by the repoint tests  to prove a
    // genuine destination change, not a  no-op PATCH of the same value.
    private const NEW_DESTINATION = 'https://www.google.com/maps/dir/?api=1&destination=41.1579,-8.6291&travelmode=driving&dir_action=navigate';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_unauthenticated_go_redirects_to_login_and_leaks_nothing(): void
    {
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);

        $response = $this->get('/go/'.$link->code);

        $response->assertRedirect(route('login'));

        $body = $response->getContent() ?: '';
        $this->assertStringNotContainsString(self::DESTINATION, $body);
        $this->assertStringNotContainsString(urlencode(self::DESTINATION), $body);
        $this->assertStringNotContainsString(self::COORDINATE_FRAGMENT, $body);

        foreach ($response->headers->all() as $headerValues) {
            foreach ($headerValues as $value) {
                $this->assertStringNotContainsString(self::DESTINATION, $value);
                $this->assertStringNotContainsString(urlencode(self::DESTINATION), $value);
                $this->assertStringNotContainsString(self::COORDINATE_FRAGMENT, $value);
            }
        }

        // The destination stayed entirely server-side — only the /go/{code}  path itself was
        // stashed for the post-login round-trip.
        $this->assertSame(route('go', ['code' => $link->code]), session('url.intended'));
    }

    public function test_login_after_intercepted_go_redirects_back_to_go(): void
    {
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);
        $user = User::factory()->create(['password' => bcrypt('correct-password')]);

        // Hit /go/{code} unauthenticated first, so the intended URL is stashed.
        $this->get('/go/'.$link->code);

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ]);

        $response->assertRedirect(route('go', ['code' => $link->code]));
    }

    public function test_authenticated_enabled_link_redirects_to_destination_with_no_store(): void
    {
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION, 'enabled' => true]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/go/'.$link->code);

        $response->assertRedirect(self::DESTINATION);
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_code_lookup_ignores_case(): void
    {
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION, 'enabled' => true]);
        $user = User::factory()->create();

        $this->actingAs($user)->get('/go/'.strtoupper($link->code))->assertRedirect(self::DESTINATION);
    }

    public function test_authenticated_disabled_link_404s(): void
    {
        $link = ShortLink::factory()->disabled()->create(['destination' => self::DESTINATION]);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/go/'.$link->code);

        $response->assertNotFound();
    }

    public function test_unknown_code_404s_identically_to_disabled(): void
    {
        $user = User::factory()->create();

        $disabled = ShortLink::factory()->disabled()->create();
        $disabledResponse = $this->actingAs($user)->get('/go/'.$disabled->code);

        $unknownResponse = $this->actingAs($user)->get('/go/does-not-exist');

        $unknownResponse->assertNotFound();
        $this->assertSame($disabledResponse->getStatusCode(), $unknownResponse->getStatusCode());
        $this->assertSame(
            $this->errorPagePayload($disabledResponse->getContent()),
            $this->errorPagePayload($unknownResponse->getContent()),
        );
    }

    /** @return array<string, mixed> the Inertia page object minus its echoed `url`. */
    private function errorPagePayload(string $html): array
    {
        $this->assertSame(1, preg_match('/<script data-page="app" type="application\/json">(.*?)<\/script>/s', $html, $m));

        $page = json_decode($m[1], true, 512, JSON_THROW_ON_ERROR);
        unset($page['url']);

        return $page;
    }

    public function test_non_admin_cannot_view_links_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.shortlinks.index'));

        $response->assertForbidden();
    }

    public function test_admin_can_view_links_index(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->get(route('admin.shortlinks.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Shell/Pages/Admin/ShortLinks'));
    }

    public function test_store_rejects_javascript_destination(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.shortlinks.store'), [
            'label' => 'Malicious',
            'destination' => 'javascript:alert(1)',
        ]);

        $response->assertSessionHasErrors('destination');
        $this->assertDatabaseCount('short_links', 0);
    }

    public function test_store_rejects_data_destination(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.shortlinks.store'), [
            'label' => 'Malicious',
            'destination' => 'data:text/html,<script>alert(1)</script>',
        ]);

        $response->assertSessionHasErrors('destination');
        $this->assertDatabaseCount('short_links', 0);
    }

    public function test_store_creates_link_with_lowercase_only_code(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->post(route('admin.shortlinks.store'), [
            'label' => 'Keychain tag',
            'destination' => self::DESTINATION,
        ]);

        $response->assertRedirect(route('admin.shortlinks.index'));

        $link = ShortLink::firstOrFail();
        $this->assertSame($link->code, strtolower($link->code));
        $this->assertMatchesRegularExpression('/^[a-z2-9]+$/', $link->code);
        $this->assertSame($admin->id, $link->created_by);
    }

    public function test_update_toggles_enabled(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create(['enabled' => true, 'destination' => self::DESTINATION]);
        $codeBefore = $link->code;
        $destinationBefore = $link->destination;

        $response = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'enabled' => false,
        ]);

        $response->assertRedirect(route('admin.shortlinks.index'));
        $fresh = $link->fresh();
        $this->assertFalse($fresh->enabled);
        $this->assertSame($codeBefore, $fresh->code);
        $this->assertSame($destinationBefore, $fresh->destination);
    }

    public function test_repointing_destination_changes_the_redirect_and_never_the_code(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create(['enabled' => true, 'destination' => self::DESTINATION]);
        $codeBefore = $link->code;

        $response = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'label' => 'New label',
            'destination' => self::NEW_DESTINATION,
        ]);

        $response->assertRedirect(route('admin.shortlinks.index'));

        $fresh = $link->fresh();
        $this->assertSame($codeBefore, $fresh->code);
        $this->assertSame(self::NEW_DESTINATION, $fresh->destination);
        $this->assertSame('New label', $fresh->label);

        // The same code, tapped by an ordinary authenticated user, now lands  on the NEW
        // destination.
        $user = User::factory()->create();
        $goResponse = $this->actingAs($user)->get('/go/'.$codeBefore);
        $goResponse->assertRedirect(self::NEW_DESTINATION);
    }

    public function test_update_cannot_change_the_code(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);
        $codeBefore = $link->code;

        $response = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'label' => 'Renamed',
            'destination' => self::NEW_DESTINATION,
            'code' => 'hacked01',
        ]);

        $response->assertRedirect(route('admin.shortlinks.index'));
        $this->assertSame($codeBefore, $link->fresh()->code);
    }

    public function test_update_rejects_unsafe_destination_schemes(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);

        $jsResponse = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'label' => 'Malicious',
            'destination' => 'javascript:alert(1)',
        ]);
        $jsResponse->assertSessionHasErrors('destination');
        $this->assertSame(self::DESTINATION, $link->fresh()->destination);

        $dataResponse = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'label' => 'Malicious',
            'destination' => 'data:text/html,<script>alert(1)</script>',
        ]);
        $dataResponse->assertSessionHasErrors('destination');
        $this->assertSame(self::DESTINATION, $link->fresh()->destination);
    }

    public function test_non_admin_cannot_update_link(): void
    {
        $user = User::factory()->create();
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);

        $response = $this->actingAs($user)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'label' => 'Should not work',
            'destination' => self::NEW_DESTINATION,
        ]);

        $response->assertForbidden();
        $this->assertSame(self::DESTINATION, $link->fresh()->destination);
    }

    public function test_update_with_no_recognised_fields_is_a_validation_error(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create(['destination' => self::DESTINATION]);

        $response = $this->actingAs($admin)->patch(route('admin.shortlinks.update', ['shortlink' => $link->id]), [
            'destinaton' => 'https://example.com',
        ]);

        $response->assertSessionHasErrors('label');
        $this->assertSame(self::DESTINATION, $link->fresh()->destination);
    }

    public function test_destroy_hard_deletes(): void
    {
        $admin = User::factory()->admin()->create();
        $link = ShortLink::factory()->create();

        $response = $this->actingAs($admin)->delete(route('admin.shortlinks.destroy', ['shortlink' => $link->id]));

        $response->assertRedirect(route('admin.shortlinks.index'));
        $this->assertDatabaseMissing('short_links', ['id' => $link->id]);
    }
}
