<?php

namespace Tests\Feature\Mail;

use Tests\TestCase;

class MailConfigTest extends TestCase
{
    public function test_resend_mailer_registered(): void
    {
        $this->assertEquals(
            'resend',
            config('mail.mailers.resend.transport'),
            'resend mailer must be registered in config/mail.php with transport=resend'
        );
    }

    public function test_resend_services_key_bound(): void
    {
        // phpunit.xml sets RESEND_API_KEY=re_test so this assertion validates  that
        // config/services.php reads the env var (not a hardcoded value).
        $this->assertEquals(
            're_test',
            config('services.resend.key'),
            'config/services.php must bind services.resend.key to the RESEND_API_KEY env var'
        );
    }

    public function test_warm_mail_layout_renders(): void
    {
        $this->assertTrue(
            view()->exists('components.mail.layouts.warm'),
            'resources/views/components/mail/layouts/warm.blade.php must exist'
        );

        $rendered = view('components.mail.layouts.warm', ['slot' => 'TEST_SLOT_CONTENT'])->render();

        $this->assertStringContainsString(
            'TEST_SLOT_CONTENT',
            $rendered,
            'warm layout must render {{ $slot }} content'
        );

        $this->assertStringContainsString(
            '#FAF5EF',
            $rendered,
            'warm layout must use the warm background hex token #FAF5EF (catches palette drift)'
        );
    }
}
