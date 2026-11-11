<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use Inertia\Support\SessionKey;

abstract class TestCase extends BaseTestCase
{
    protected function assertSuccessToast(TestResponse $response, string $message): void
    {
        $response->assertSessionHas(SessionKey::FLASH_DATA, [
            'toast' => ['type' => 'success', 'message' => $message],
        ]);
    }
}
