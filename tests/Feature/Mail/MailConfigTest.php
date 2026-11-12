<?php

namespace Tests\Feature\Mail;

use Tests\TestCase;

class MailConfigTest extends TestCase
{
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
