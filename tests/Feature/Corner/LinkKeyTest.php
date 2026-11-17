<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Support\LinkKey;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class LinkKeyTest extends TestCase
{
    /** @return array<string, array{0: string, 1: string}> */
    public static function same(): array
    {
        $base = 'https://example.com/watch?a=1&v=abc';

        return [
            'scheme and host case' => [$base, 'HTTPS://Example.COM/watch?a=1&v=abc'],
            'a fragment' => [$base, 'https://example.com/watch?a=1&v=abc#t=30'],
            'the default https port' => [$base, 'https://example.com:443/watch?a=1&v=abc'],
            'a trailing slash' => [$base, 'https://example.com/watch/?a=1&v=abc'],
            'tracking parameters' => [$base, 'https://example.com/watch?utm_source=chat&a=1&fbclid=x&v=abc&gclid=y&si=z'],
            'parameter order' => [$base, 'https://example.com/watch?v=abc&a=1'],
            'surrounding spaces' => [$base, "  {$base}  "],
            'the default http port' => ['http://example.com/a', 'http://example.com:80/a'],
            'a bare host' => ['https://example.com', 'https://example.com/'],
        ];
    }

    #[DataProvider('same')]
    public function test_the_same_page_written_differently_has_one_key(string $a, string $b): void
    {
        $this->assertSame(LinkKey::normalise($a), LinkKey::normalise($b));
        $this->assertSame(LinkKey::for($a), LinkKey::for($b));
        $this->assertSame(64, strlen((string) LinkKey::for($a)));
    }

    /** @return array<string, array{0: string, 1: string}> */
    public static function different(): array
    {
        return [
            'http and https' => ['http://example.com/a', 'https://example.com/a'],
            'another port' => ['https://example.com/a', 'https://example.com:8443/a'],
            'path case' => ['https://example.com/A', 'https://example.com/a'],
            'another parameter value' => ['https://example.com/watch?v=abc', 'https://example.com/watch?v=abd'],
            'www' => ['https://www.example.com/a', 'https://example.com/a'],
        ];
    }

    #[DataProvider('different')]
    public function test_different_pages_have_different_keys(string $a, string $b): void
    {
        $this->assertNotSame(LinkKey::for($a), LinkKey::for($b));
    }

    public function test_normal_form_and_what_has_no_key(): void
    {
        $this->assertSame('https://example.com/watch?a=1&v=abc', LinkKey::normalise('HTTPS://Example.com:443/watch/?v=abc&utm_medium=x&a=1#frag'));
        $this->assertNull(LinkKey::for('ftp://example.com/a'));
        $this->assertNull(LinkKey::for('not a link'));
        $this->assertNull(LinkKey::for('mailto:someone@example.com'));
    }

    public function test_the_site_is_the_host_a_reader_recognises(): void
    {
        $this->assertSame('example.com', LinkKey::siteOf('https://WWW.Example.com/a'));
        $this->assertSame('music.example.com', LinkKey::siteOf('https://music.example.com/'));
        $this->assertNull(LinkKey::siteOf('nothing here'));
    }
}
