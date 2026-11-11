<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\SanitizeBodyHtml;
use Tests\TestCase;

class SanitizeBodyHtmlTest extends TestCase
{
    private SanitizeBodyHtml $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = new SanitizeBodyHtml;
    }

    public function test_keeps_allowlisted_tags_idempotent(): void
    {
        $input = '<p><strong>bold</strong> <em>italic</em></p><h2>head</h2><ul><li>item</li></ul>';

        $pass1 = ($this->action)($input);
        $pass2 = ($this->action)($pass1);

        $this->assertStringContainsString('<strong>bold</strong>', $pass1);
        $this->assertStringContainsString('<em>italic</em>', $pass1);
        $this->assertStringContainsString('<h2>head</h2>', $pass1);
        $this->assertStringContainsString('<li>item</li>', $pass1);

        // Second pass through the sanitizer produces the same output (idempotency  is the
        // inverse of a smuggled-encoding bypass: round-trip drift would  indicate a sanitizer
        // that can be fooled by re-escaping).
        $this->assertSame($pass1, $pass2);
    }

    public function test_strips_script_tags(): void
    {
        $output = ($this->action)('<p>hi</p><script>alert(1)</script>');

        $this->assertStringNotContainsString('<script', $output);
        $this->assertStringNotContainsString('alert(1)', $output);
    }

    public function test_strips_onerror_attributes(): void
    {
        $output = ($this->action)('<p><img src=x onerror=alert(1)></p>');

        $this->assertStringNotContainsString('onerror', $output);
        $this->assertStringNotContainsString('alert(1)', $output);
    }

    public function test_strips_javascript_urls(): void
    {
        $output = ($this->action)('<p><a href="javascript:alert(1)">click</a></p>');

        $this->assertStringNotContainsString('javascript:', $output);
    }

    public function test_strips_data_uri_links(): void
    {
        $output = ($this->action)('<p><a href="data:text/html,<script>alert(1)</script>">x</a></p>');

        $this->assertStringNotContainsString('data:', $output);
    }

    public function test_preserves_mailto_links(): void
    {
        $output = ($this->action)('<p><a href="mailto:hi@example.com">hi</a></p>');

        $this->assertStringContainsString('mailto:hi@example.com', $output);
    }

    public function test_external_link_gets_rel_noopener_noreferrer(): void
    {
        $output = ($this->action)('<p><a href="https://example.com">x</a></p>');

        $this->assertStringContainsString('rel=', $output);
        $this->assertStringContainsString('noopener', $output);
        $this->assertStringContainsString('noreferrer', $output);
    }

    public function test_external_link_gets_target_blank(): void
    {
        $output = ($this->action)('<p><a href="https://example.com">x</a></p>');

        $this->assertStringContainsString('target="_blank"', $output);
    }

    public function test_strips_raw_html_inside_disallowed_tags(): void
    {
        $output = ($this->action)('<p>hi<form><input></form></p>');

        $this->assertStringNotContainsString('<form', $output);
        $this->assertStringNotContainsString('<input', $output);
    }

    public function test_preserves_corner_link_attrs(): void
    {
        $input = '<p>before '
            .'<span data-corner-type="corner.song" data-corner-id="42"'
            .' data-corner-title="Test track" data-corner-thumbnail="https://i.ytimg.com/x.jpg"'
            .' data-corner-href="/apps/our-corner/songs/42">Test track</span>'
            .' after</p>';

        $output = ($this->action)($input);

        $this->assertStringContainsString('data-corner-type="corner.song"', $output);
        $this->assertStringContainsString('data-corner-id="42"', $output);
        $this->assertStringContainsString('data-corner-title="Test track"', $output);
        $this->assertStringContainsString(
            'data-corner-thumbnail="https://i.ytimg.com/x.jpg"',
            $output,
        );
        $this->assertStringContainsString(
            'data-corner-href="/apps/our-corner/songs/42"',
            $output,
        );

        // Negative: onclick on the same span MUST be stripped even though  span itself is now
        // allowed.
        $unsafe = '<p><span data-corner-type="corner.song" data-corner-id="1"'
            .' data-corner-title="x" data-corner-thumbnail="" data-corner-href="/x"'
            .' onclick="alert(1)">x</span></p>';
        $unsafeOut = ($this->action)($unsafe);
        $this->assertStringNotContainsString('onclick', $unsafeOut);
        $this->assertStringNotContainsString('alert(1)', $unsafeOut);
    }
}
