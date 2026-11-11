<?php

namespace Tests\Unit\Shell;

use App\Shell\Support\TrustedProxies;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TrustedProxiesTest extends TestCase
{
    public function test_empty_and_unset_mean_private_ranges(): void
    {
        $this->assertSame(TrustedProxies::PRIVATE_RANGES, TrustedProxies::parse(null));
        $this->assertSame(TrustedProxies::PRIVATE_RANGES, TrustedProxies::parse(' '));
    }

    public function test_keywords_and_ranges_combine_without_duplicates(): void
    {
        $proxies = TrustedProxies::parse('Cloudflare, private, 10.0.0.0/8, 203.0.113.7');

        $this->assertSame(
            [...TrustedProxies::CLOUDFLARE_RANGES, ...TrustedProxies::PRIVATE_RANGES, '203.0.113.7'],
            $proxies,
        );
    }

    public function test_star_trusts_everyone(): void
    {
        $this->assertSame('*', TrustedProxies::parse('private,*'));
    }

    /** @return array<string, array{string}> */
    public static function invalidValues(): array
    {
        return [
            'word' => ['traefik'],
            'bad prefix' => ['10.0.0.0/33'],
            'bad v6 prefix' => ['fc00::/129'],
            'not an ip' => ['10.0.0/8'],
        ];
    }

    #[DataProvider('invalidValues')]
    public function test_rejects_values_it_cannot_read(string $value): void
    {
        $this->expectException(InvalidArgumentException::class);

        TrustedProxies::parse($value);
    }

    public function test_detects_cloudflare_mode(): void
    {
        $this->assertTrue(TrustedProxies::includesCloudflare('private, cloudflare'));
        $this->assertFalse(TrustedProxies::includesCloudflare('private'));
        $this->assertFalse(TrustedProxies::includesCloudflare(null));
    }
}
