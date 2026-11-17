<?php

namespace Tests;

use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;
use Inertia\Support\SessionKey;

abstract class TestCase extends BaseTestCase
{
    /**
     * A fresh install has no rooms on. Tests exercise the rooms, so they start with all of
     * them; one about the switches turns off what it needs.
     */
    protected function setUpTraits(): array
    {
        $uses = parent::setUpTraits();

        if (isset($uses[RefreshDatabase::class])) {
            app(Rooms::class)->turnOnAll();
        }

        return $uses;
    }

    protected function assertSuccessToast(TestResponse $response, string $message): void
    {
        $response->assertSessionHas(SessionKey::FLASH_DATA, [
            'toast' => ['type' => 'success', 'message' => $message],
        ]);
    }
}
