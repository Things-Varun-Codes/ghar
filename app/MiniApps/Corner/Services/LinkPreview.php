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

    private const DETAILS = ' · ';

    private const LEADING_PART = '/^(.+?)\s+[|\x{2013}\x{2014}-]\s+(.+)$/u';

    private const TRAILING_PART = '/^(.+)\s+[|\x{2013}\x{2014}-]\s+(.+?)$/u';

    public function __construct(private readonly SafeFetcher $fetcher) {}

    /**
     * Cached, so the preview while typing and the save that follows cost one fetch.
     *
     * @return array{title: ?string, image_url: ?string, author: ?string, site_name: ?string}
     */
    public function lookup(string $url): array
    {
        // v4: names and site names are tidied before they are cached, beside where it landed.
        $key = 'corner:link-preview:v4:'.(LinkKey::for($url) ?? sha1($url));

        $found = Cache::get($key);
        if (! is_array($found)) {
            $found = $this->read($url);
            $hit = $found['title'] !== null || $found['image_url'] !== null;
            Cache::put($key, $found, $hit ? self::FOUND_SECONDS : self::MISSED_SECONDS);
        }

        // A page that names nothing is named from where the link landed, after caching, so a
        // page that couldn't be read is soon asked again.
        $found['title'] ??= self::nameFromLink($found['landed']);
        unset($found['landed']);

        return $found;
    }

    /** @return array{title: ?string, image_url: ?string, author: ?string, site_name: ?string, landed: string} */
    private function read(string $url): array
    {
        $empty = ['title' => null, 'image_url' => null, 'author' => null, 'site_name' => LinkKey::siteOf($url), 'landed' => $url];

        $page = $this->fetcher->get($url, [...self::PAGE_TYPES, ...PictureCache::TYPES], self::PAGE_BYTES, truncate: true);
        if ($page === null) {
            return $empty;
        }

        // A link straight to a picture is its own picture.
        if (in_array($page->contentType, PictureCache::TYPES, true)) {
            return ['image_url' => $page->url, 'landed' => $page->url] + $empty;
        }

        try {
            $meta = $this->meta($page->body, $page->url);
        } catch (Throwable $e) {
            report($e);

            return ['landed' => $page->url] + $empty;
        }

        $oembed = $meta['oembed'] !== null ? $this->oembed($meta['oembed']) : [];
        $title = self::clean($oembed['title'] ?? $meta['og:title'] ?? $meta['twitter:title'] ?? $meta['title'], 255);
        $site = self::clean($meta['og:site_name'] ?? $oembed['provider_name'] ?? null, 120);

        return [
            'title' => self::name($title, $site, $page->url),
            'image_url' => $oembed['thumbnail_url'] ?? $meta['og:image'] ?? $meta['twitter:image'] ?? $meta['icon'],
            'author' => self::clean($oembed['author_name'] ?? $meta['author'], 255),
            // A page that gives its own title as its site's name hasn't named the site; the
            // host it landed on has, which also sees through short links.
            'site_name' => ($site !== $title ? $site : null) ?? LinkKey::siteOf($page->url),
            'landed' => $page->url,
        ];
    }

    /**
     * What to call the thing a page is about. A plain title that is also the site's name, like
     * a sign-in wall's, is only the site naming itself. Otherwise the site's own name comes off
     * either end ("Cubbon Park - Wikipedia", "GitHub - laravel/framework"), and a title shaped
     * "Name · details" (a place and its address, a song and its artist) keeps the name.
     */
    private static function name(?string $title, ?string $site, string $landed): ?string
    {
        if ($title === null || ($title === $site && ! str_contains($title, self::DETAILS))) {
            return null;
        }

        $brand = self::brandOf($landed);
        $isSite = fn (string $part, bool $whole): bool => in_array(self::squash($part), [self::squash($site ?? ''), $brand], true)
            || (! $whole && $brand !== null && str_starts_with(self::squash($part), $brand));

        // A leading part has to be exactly the site: "Amazon Echo Dot - Smart speaker" isn't.
        if (preg_match(self::LEADING_PART, $title, $m) === 1 && $isSite($m[1], true)) {
            $title = $m[2];
        }
        if (preg_match(self::TRAILING_PART, $title, $m) === 1 && $isSite($m[2], false)) {
            $title = $m[1];
        }

        return trim(explode(self::DETAILS, $title, 2)[0]) ?: $title;
    }

    /** "wikipedia" for en.wikipedia.org, "bbc" for bbc.co.uk; null when too short to tell. */
    private static function brandOf(string $url): ?string
    {
        $labels = explode('.', LinkKey::siteOf($url) ?? '');
        array_pop($labels);
        // A second-level suffix like co.uk or com.au.
        if (count($labels) > 1 && strlen((string) end($labels)) <= 3) {
            array_pop($labels);
        }
        $brand = self::squash((string) end($labels));

        return strlen($brand) >= 3 ? $brand : null;
    }

    private static function squash(string $text): string
    {
        return preg_replace('/[^\p{L}\p{N}]+/u', '', mb_strtolower($text)) ?? '';
    }

    /**
     * The most readable part of a link: the path segment or search with the most words, so
     * /maps/place/Lalbagh+Botanical+Garden/@12.9,77.5 is "Lalbagh Botanical Garden" and
     * /film/dune-2021 is "dune 2021". Codes and ids (dQw4w9WgXcQ, tt1160419) name nothing.
     */
    private static function nameFromLink(string $url): ?string
    {
        $parts = parse_url($url);
        $segments = array_values(array_filter(array_map(urldecode(...), explode('/', $parts['path'] ?? ''))));
        $last = count($segments) - 1;
        parse_str($parts['query'] ?? '', $query);
        foreach (['q', 'query'] as $field) {
            if (is_string($query[$field] ?? null)) {
                $segments[] = $query[$field];
            }
        }

        $best = null;
        $bestWords = 0;
        foreach ($segments as $i => $text) {
            $text = preg_replace('/\.[a-z0-9]{2,5}$/i', '', $text) ?? $text;
            $code = preg_match('/[\s_+-]/', $text) !== 1 && preg_match('/^\p{L}+$/u', $text) !== 1;
            if ($code || preg_match('/[@=!]/', $text) === 1) {
                continue;
            }

            // Ids inside a slug: "welcome-to-medium-9e53ca408c48", "44767458-dune".
            $words = array_filter(
                preg_split('/[\s_+-]+/u', $text) ?: [],
                fn (string $word): bool => preg_match('/^(?=.*\d)[\p{L}\d]{6,}$|^\d{5,}$/u', $word) !== 1,
            );
            $text = implode(' ', $words);
            $count = preg_match_all('/\p{L}{3,}/u', $text);
            // One word mid-path is usually a section ("rooms", "search"); at the end it's a name.
            if ($count === 0 || ($count === 1 && $i < $last) || $count < $bestWords) {
                continue;
            }
            [$best, $bestWords] = [$text, $count];
        }

        return $best === null ? null : mb_substr($best, 0, 255);
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
