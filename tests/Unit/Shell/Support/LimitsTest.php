<?php

namespace Tests\Unit\Shell\Support;

use App\Shell\Models\User;
use App\Shell\Support\Limits;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class LimitsTest extends TestCase
{
    public function test_a_signed_in_request_is_keyed_by_the_user(): void
    {
        $user = new User;
        $user->id = 42;
        $request = Request::create('/', 'POST', server: ['REMOTE_ADDR' => '203.0.113.7']);
        $request->setUserResolver(fn () => $user);

        $limit = (Limits::perUser(30))($request);

        $this->assertSame('42', $limit->key);
        $this->assertSame(30, $limit->maxAttempts);
        $this->assertSame(60, $limit->decaySeconds);
    }

    public function test_a_guest_is_keyed_by_ip(): void
    {
        $request = Request::create('/', 'POST', server: ['REMOTE_ADDR' => '203.0.113.7']);

        $this->assertSame('203.0.113.7', (Limits::perUser(10))($request)->key);
    }
}
