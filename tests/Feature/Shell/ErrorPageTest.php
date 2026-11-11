<?php

namespace Tests\Feature\Shell;

use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: User, 2: User} issuer, recipient, stranger */
    private function pairPlusStranger(): array
    {
        $issuer = User::factory()->create();
        $recipient = User::factory()->create();

        return [$issuer, $recipient, User::factory()->create()];
    }

    public function test_forbidden_challan_renders_the_in_shell_error_page(): void
    {
        [$issuer, $recipient, $stranger] = $this->pairPlusStranger();
        $challan = Challan::factory()->create(['issuer_id' => $issuer->id, 'recipient_id' => $recipient->id]);

        $this->actingAs($stranger)
            ->get("/apps/our-mailbox/challans/{$challan->id}")
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shell/Pages/Error')
                ->where('status', 403)
            );
    }

    public function test_forbidden_coupon_renders_the_in_shell_error_page(): void
    {
        [$issuer, $recipient, $stranger] = $this->pairPlusStranger();
        $coupon = Coupon::factory()->create([
            'issuer_id' => $issuer->id,
            'recipient_id' => $recipient->id,
            'quantity' => 2,
            'expires_at' => null,
        ]);

        $this->actingAs($stranger)
            ->get("/apps/our-mailbox/coupons/{$coupon->id}")
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shell/Pages/Error')
                ->where('status', 403)
            );
    }

    public function test_missing_record_renders_the_in_shell_404_page(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/apps/our-mailbox/challans/999999')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shell/Pages/Error')
                ->where('status', 404)
            );
    }

    public function test_error_page_carries_only_the_status_never_exception_text(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/apps/our-mailbox/challans/999999')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shell/Pages/Error')
                ->whereAll(['status' => 404])
                ->missing('message')
                ->missing('exception')
            );
    }

    public function test_guest_unknown_url_keeps_the_default_404(): void
    {
        $response = $this->get('/definitely/not/a/real/page');

        $response->assertNotFound();
        $response->assertHeaderMissing('X-Inertia');
        $this->assertStringNotContainsString('Shell/Pages/Error', $response->getContent());
    }

    public function test_json_request_keeps_a_json_403(): void
    {
        [$issuer, $recipient, $stranger] = $this->pairPlusStranger();
        $challan = Challan::factory()->create(['issuer_id' => $issuer->id, 'recipient_id' => $recipient->id]);

        $this->actingAs($stranger)
            ->getJson("/apps/our-mailbox/challans/{$challan->id}")
            ->assertForbidden()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonMissingPath('component');
    }
}
