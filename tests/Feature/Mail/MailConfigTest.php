<?php

namespace Tests\Feature\Mail;

use Tests\TestCase;

class MailConfigTest extends TestCase
{
    public function test_warm_mail_layout_renders(): void
    {
        $rendered = view('components.mail.layouts.warm', ['slot' => 'TEST_SLOT_CONTENT'])->render();

        $this->assertStringContainsString(
            'TEST_SLOT_CONTENT',
            $rendered,
            'warm layout must render {{ $slot }} content'
        );
    }
}
