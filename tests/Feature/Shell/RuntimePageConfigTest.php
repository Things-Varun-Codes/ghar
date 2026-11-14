<?php

namespace Tests\Feature\Shell;

use Tests\TestCase;

class RuntimePageConfigTest extends TestCase
{
    public function test_the_page_carries_the_runtime_name_and_browser_dsn(): void
    {
        config([
            'app.name' => 'Casa',
            'services.sentry_browser.dsn' => 'https://public@errors.example.com/2',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertSee('<meta name="application-name" content="Casa">', false)
            ->assertSee('<meta name="sentry-dsn" content="https://public@errors.example.com/2">', false);
    }

    public function test_the_manifest_carries_the_runtime_name(): void
    {
        config(['app.name' => 'Casa']);

        $this->get('/manifest.webmanifest')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json')
            ->assertJson(['name' => 'Casa', 'short_name' => 'Casa', 'start_url' => '/'])
            ->assertJsonCount(3, 'icons');
    }

    public function test_no_dsn_means_no_sentry_meta(): void
    {
        config(['services.sentry_browser.dsn' => null]);

        $this->get(route('login'))->assertOk()->assertDontSee('name="sentry-dsn"', false);
    }
}
