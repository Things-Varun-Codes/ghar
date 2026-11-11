<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Actions\SanitizeBodyHtml;
use Tests\TestCase;

class MarkdownSanitizationTest extends TestCase
{
    private SanitizeBodyHtml $action;

    protected function setUp(): void
    {
        parent::setUp();
        $this->action = new SanitizeBodyHtml;
    }

    public function test_script_tag_stripped(): void
    {
        $output = ($this->action)('A <script>alert(1)</script> B');

        $this->assertStringNotContainsString('<script', $output);
        $this->assertStringNotContainsString('</script>', $output);
    }

    public function test_onerror_handler_stripped(): void
    {
        $output = ($this->action)('<img src=x onerror=alert(1)>');

        $this->assertStringNotContainsString('onerror=', $output);
        $this->assertStringNotContainsString('alert(1)', $output);
    }

    public function test_javascript_uri_stripped(): void
    {
        $output = ($this->action)('<a href="javascript:alert(1)">click</a>');

        $this->assertStringNotContainsString('javascript:', $output);
    }

    public function test_data_uri_stripped(): void
    {
        $output = ($this->action)('<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;">click</a>');

        $this->assertStringNotContainsString('data:', $output);
    }

    public function test_external_link_gets_rel_noopener(): void
    {
        $output = ($this->action)('<a href="https://example.com">ext</a>');

        $this->assertStringContainsString('noopener', $output);
        $this->assertStringContainsString('noreferrer', $output);
    }

    public function test_external_link_gets_target_blank(): void
    {
        $output = ($this->action)('<a href="https://example.com">ext</a>');

        $this->assertStringContainsString('target="_blank"', $output);
    }

    public function test_mailto_link_preserved(): void
    {
        $output = ($this->action)('<a href="mailto:x@y.com">contact</a>');

        $this->assertStringContainsString('mailto:', $output);
    }

    public function test_raw_html_input_stripped(): void
    {
        $output = ($this->action)('<div onclick=alert(1)>X</div>');

        // The <div> element itself must not reach the output.
        $this->assertStringNotContainsString('<div', $output);
    }
}
