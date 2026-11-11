<?php

namespace Tests\Feature\Auth;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class RememberMeTest extends TestCase
{
    use RefreshDatabase;

    public function test_remember_me_cookie_is_set_when_remember_flag_submitted(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
            'remember' => 'on',
        ]);

        $this->assertAuthenticated();

        $recallerName = Auth::guard()->getRecallerName();

        // The recaller cookie is queued on the response; assertCookie checks the  response
        // cookie bag (not the encrypted-cookies jar), so we check the  raw queued cookies on
        // the response.
        $this->assertTrue(
            $response->headers->getCookies() !== [] &&
            collect($response->headers->getCookies())
                ->contains(fn ($c) => $c->getName() === $recallerName),
            "A '{$recallerName}' remember-me cookie must be present on the login response when remember=on"
        );
    }

    public function test_remember_me_cookie_is_absent_when_remember_flag_not_submitted(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
            // no 'remember' field
        ]);

        $this->assertAuthenticated();

        $recallerName = Auth::guard()->getRecallerName();

        $cookies = collect($response->headers->getCookies());
        $this->assertFalse(
            $cookies->contains(fn ($c) => $c->getName() === $recallerName),
            'A remember-me cookie must NOT be set when the remember flag is not submitted'
        );
    }
}
