<?php

namespace Tests\Feature\Security;

use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SentryConfigTest extends TestCase
{
    public function test_sentry_sends_no_pii_and_ignores_validation_errors(): void
    {
        $cfg = config('sentry');

        $this->assertIsArray(
            $cfg,
            "config('sentry') is null — has config/sentry.php been published?"
        );

        $this->assertContains(
            ValidationException::class,
            $cfg['ignore_exceptions'] ?? [],
            'sentry.ignore_exceptions missing ValidationException — that would flood GlitchTip with Inertia 422 form errors'
        );

        $this->assertSame(
            false,
            $cfg['send_default_pii'] ?? null,
            'send_default_pii must be false (no IP / user data sent by default)'
        );

    }
}
