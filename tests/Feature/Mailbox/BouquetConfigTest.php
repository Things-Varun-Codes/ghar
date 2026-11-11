<?php

namespace Tests\Feature\Mailbox;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BouquetConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_bouquet_config_block_exists_as_array(): void
    {
        $this->assertIsArray(
            config('services.bouquet'),
            'Expected config("services.bouquet") to be an array — add the bouquet block to config/services.php'
        );
    }

    public function test_bouquet_config_has_cf_account_id_entry(): void
    {
        $bouquet = config('services.bouquet', null);

        $this->assertIsArray($bouquet, 'Expected config("services.bouquet") to be an array');
        $this->assertArrayHasKey(
            'cf_account_id',
            $bouquet,
            'config("services.bouquet") must have a "cf_account_id" entry wired to env("CLOUDFLARE_ACCOUNT_ID")'
        );
        $this->assertArrayHasKey(
            'cf_token',
            $bouquet,
            'config("services.bouquet") must have a "cf_token" entry wired to env("CLOUDFLARE_WORKERS_AI_TOKEN")'
        );
    }

    public function test_bouquet_config_has_provider_entry_mapped_from_env(): void
    {
        $bouquet = config('services.bouquet', null);

        $this->assertIsArray($bouquet, 'Expected config("services.bouquet") to be an array');
        $this->assertArrayHasKey(
            'provider',
            $bouquet,
            'config("services.bouquet") must have a "provider" entry wired to env("BOUQUET_IMAGE_PROVIDER")'
        );
    }

    public function test_bouquet_cf_model_has_non_empty_default(): void
    {
        $this->assertNotEmpty(
            config('services.bouquet.cf_model'),
            'config("services.bouquet.cf_model") must have a non-empty default (e.g. @cf/black-forest-labs/flux-1-schnell)'
        );
    }

    public function test_docker_compose_declares_bouquet_env_vars(): void
    {
        $dockerCompose = file_get_contents(base_path('docker-compose.yml'));

        $this->assertStringContainsString(
            'BOUQUET_IMAGE_PROVIDER',
            $dockerCompose,
            'docker-compose.yml must declare BOUQUET_IMAGE_PROVIDER for prod routing'
        );

        $this->assertStringContainsString(
            'CLOUDFLARE_ACCOUNT_ID',
            $dockerCompose,
            'docker-compose.yml must declare CLOUDFLARE_ACCOUNT_ID for prod routing'
        );

        $this->assertStringContainsString(
            'CLOUDFLARE_WORKERS_AI_TOKEN',
            $dockerCompose,
            'docker-compose.yml must declare CLOUDFLARE_WORKERS_AI_TOKEN for prod routing'
        );

        $this->assertStringNotContainsString(
            'GEMINI_API_KEY',
            $dockerCompose,
            'docker-compose.yml must NOT declare GEMINI_API_KEY (Gemini provider removed)'
        );
    }
}
