<?php

namespace App\MiniApps\Corner\Services;

use App\MiniApps\Corner\Support\ItemRules;
use App\MiniApps\Corner\Support\LinkKey;
use App\MiniApps\Corner\Support\PictureCache;
use App\Shell\Support\Http\SafeFetcher;
use Dom\HTMLDocument;
use GuzzleHttp\Psr7\Uri;
use GuzzleHttp\Psr7\UriResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Throwable;

/**
 * What a pasted link says about itself, read only from what the page publishes for everyone:
 * an oEmbed endpoint it links to, then Open Graph and Twitter card tags, its <title>, and its
 * largest declared icon. No site is known by name. A page that blocks this, or isn't reachable,
 * just gives nothing, and the item is saved with what was typed.
 */
class LinkPreview
{
    // Some pages put their metadata after most of a megabyte of inline script.
    private const PAGE_BYTES = 2 * 1024 * 1024;

    private const OEMBED_BYTES = 64 * 1024;

    private const FOUND_SECONDS = 86400;

    private const MISSED_SECONDS = 600;

    private const PAGE_TYPES = ['text/html', 'application/xhtml+xml'];

    public function __construct(private readonly SafeFetcher $fetcher) {}

    /**
     * Cached, so the preview while typing and the save that follows cost one fetch.
     *
     * @return array{title: ?string, image_url: ?string, author: ?string, site_name: ?string, url: string}
     */
    public function lookup(string $url): array
    {
        // v2: an entry also holds where the link landed.
        $key = 'corner:link-preview:v2:'.(LinkKey::for($url) ?? sha1($url));

        $cached = Cache::get($key);
        if (is_array($cached)) {
            return $cached;
        }

        $found = $this->read($url);
        $hit = $found['title'] !== null || $found['image_url'] !== null;
        Cache::put($key, $found, $hit ? self::FOUND_SECONDS : self::MISSED_SECONDS);

        return $found;
    }

    /** @return array{title: ?string, image_url: ?string, author: ?string, site_name: ?string, url: string} */
    private function read(string $url): array
    {
        $empty = ['title' => null, 'image_url' => null, 'author' => null, 'site_name' => LinkKey::siteOf($url), 'url' => $url];

        $page = $this->fetcher->get($url, [...self::PAGE_TYPES, ...PictureCache::TYPES], self::PAGE_BYTES, truncate: true);
        if ($page === null) {
            return $empty;
        }

        // A link straight to a picture is its own picture.
        if (in_array($page->contentType, PictureCache::TYPES, true)) {
            return ['image_url' => $page->url, 'url' => $page->url] + $empty;
        }

        try {
            $meta = $this->meta($page->body, $page->url);
        } catch (Throwable $e) {
            report($e);

            return $empty;
        }

        $oembed = $meta['oembed'] !== null ? $this->oembed($meta['oembed']) : [];

        return [
            'title' => self::clean($oembed['title'] ?? $meta['og:title'] ?? $meta['twitter:title'] ?? $meta['title'], 255),
            'image_url' => $oembed['thumbnail_url'] ?? $meta['og:image'] ?? $meta['twitter:image'] ?? $meta['icon'],
            'author' => self::clean($oembed['author_name'] ?? $meta['author'], 255),
            'site_name' => self::clean($meta['og:site_name'] ?? $oembed['provider_name'] ?? null, 120)
                ?? LinkKey::siteOf($page->url),
            // Where the link landed, so a short link to a map can be read for its place.
            'url' => $page->url,
        ];
    }

    /**
     * @return array{oembed: ?string, title: ?string, author: ?string, icon: ?string, 'og:title': ?string, 'og:image': ?string, 'og:site_name': ?string, 'twitter:title': ?string, 'twitter:image': ?string}
     */
    private function meta(string $html, string $base): array
    {
        $doc = HTMLDocument::createFromString($html, LIBXML_NOERROR, 'UTF-8');
        $found = [
            'oembed' => null, 'title' => null, 'author' => null, 'icon' => null,
            'og:title' => null, 'og:image' => null, 'og:site_name' => null,
            'twitter:title' => null, 'twitter:image' => null,
        ];

        foreach ($doc->querySelectorAll('meta') as $node) {
            $name = strtolower($node->getAttribute('property') ?: $node->getAttribute('name') ?? '');
            $content = trim($node->getAttribute('content') ?? '');
            if ($content === '') {
                continue;
            }

            $name = match ($name) {
                'og:image:secure_url', 'og:image:url' => 'og:image',
                'twitter:image:src' => 'twitter:image',
                default => $name,
            };

            if (array_key_exists($name, $found) && $found[$name] === null) {
                $found[$name] = $content;
            }
        }

        $found['title'] = trim($doc->querySelector('title')->textContent ?? '') ?: null;

        $bestIcon = 0;
        foreach ($doc->querySelectorAll('link[href]') as $node) {
            $rel = strtolower($node->getAttribute('rel') ?? '');
            $type = strtolower($node->getAttribute('type') ?? '');
            $href = trim($node->getAttribute('href') ?? '');

            if ($rel === 'alternate' && $type === 'application/json+oembed' && $found['oembed'] === null) {
                $found['oembed'] = self::absolute($href, $base);
            }

            if (str_contains($rel, 'icon')) {
                // apple-touch-icon is 180px unless it says otherwise; a bare icon is usually tiny.
                $size = (int) explode('x', strtolower($node->getAttribute('sizes') ?? ''))[0]
                    ?: (str_contains($rel, 'apple-touch-icon') ? 180 : 16);
                if ($size > $bestIcon && ! str_ends_with(strtolower(parse_url($href, PHP_URL_PATH) ?: ''), '.svg')) {
                    $bestIcon = $size;
                    $found['icon'] = $href;
                }
            }
        }

        foreach (['og:image', 'twitter:image', 'icon'] as $image) {
            $found[$image] = self::absolute($found[$image], $base);
        }

        return $found;
    }

    /** @return array<string, string> */
    private function oembed(string $endpoint): array
    {
        $response = $this->fetcher->get($endpoint, ['application/json', 'text/json', 'text/javascript'], self::OEMBED_BYTES);
        $json = $response === null ? null : json_decode($response->body, true);
        if (! is_array($json)) {
            return [];
        }

        $out = [];
        foreach (['title', 'author_name', 'provider_name'] as $field) {
            if (is_string($json[$field] ?? null) && trim($json[$field]) !== '') {
                $out[$field] = $json[$field];
            }
        }

        $thumbnail = self::absolute(is_string($json['thumbnail_url'] ?? null) ? $json['thumbnail_url'] : null, $endpoint);
        if ($thumbnail !== null) {
            $out['thumbnail_url'] = $thumbnail;
        }

        return $out;
    }

    private static function absolute(?string $href, string $base): ?string
    {
        if ($href === null || trim($href) === '') {
            return null;
        }

        try {
            $url = (string) UriResolver::resolve(new Uri($base), new Uri(html_entity_decode(trim($href), ENT_QUOTES | ENT_HTML5)));
        } catch (Throwable) {
            return null;
        }

        return ItemRules::isWebUrl($url) && strlen($url) <= 2048 ? $url : null;
    }

    private static function clean(?string $text, int $max): ?string
    {
        if ($text === null) {
            return null;
        }

        $text = Str::squish(html_entity_decode($text, ENT_QUOTES | ENT_HTML5));

        return $text === '' ? null : mb_substr($text, 0, $max);
    }
}
