<?php

namespace App\MiniApps\Corner\Services;

use App\MiniApps\Corner\Support\HostAllowlist;
use Illuminate\Support\Facades\Http;
use Throwable;

class PlexMetadataFetcher
{
    private const TIMEOUT_SECONDS = 5;

    private const ALLOWED_DOMAINS = ['plex.tv'];

    /** @return array{title: string, year: int|null, poster_url: string|null, watch_url: string}|null */
    public function fetch(string $url): ?array
    {
        // SSRF guard: allowlist before the HTTP call.
        if (! self::isAllowedHost($url)) {
            return null;
        }

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->withOptions(['allow_redirects' => HostAllowlist::redirectOptions(self::ALLOWED_DOMAINS)])
                ->get($url);

            if (! $response->successful()) {
                report(new \RuntimeException(
                    sprintf('Plex metadata fetch failure for %s: status %d', $url, $response->status())
                ));

                return null;
            }

            $body = $response->body();

            $title = $this->extractMetaContent($body, 'og:title');
            if ($title === null) {
                return null;
            }

            $title = html_entity_decode(trim($title), ENT_QUOTES | ENT_HTML5);

            $posterUrl = null;
            $rawPoster = $this->extractMetaContent($body, 'og:image');
            if ($rawPoster !== null) {
                $decodedPoster = html_entity_decode($rawPoster, ENT_QUOTES | ENT_HTML5);
                if ($this->isValidPosterUrl($decodedPoster)) {
                    $posterUrl = $decodedPoster;
                }
            }

            $year = null;
            $titleTagText = $this->extractTagText($body, 'title');
            if ($titleTagText !== null && preg_match('/\((\d{4})\)/', $titleTagText, $m) === 1) {
                $year = (int) $m[1];
            }

            $watchUrl = $response->effectiveUri()?->__toString() ?? $url;

            return [
                'title' => $title,
                'year' => $year,
                'poster_url' => $posterUrl,
                'watch_url' => $watchUrl,
            ];
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }

    public static function isAllowedHost(string $url): bool
    {
        return HostAllowlist::matches($url, self::ALLOWED_DOMAINS);
    }

    /**
     * Stricter than isAllowedHost(): the scraped og:image is re-emitted to the client as an
     * <img src>, so only https on exactly images.plex.tv is trusted.
     */
    private function isValidPosterUrl(string $url): bool
    {
        $parts = parse_url($url);

        if ($parts === false) {
            return false;
        }

        if (($parts['scheme'] ?? null) !== 'https') {
            return false;
        }

        $host = strtolower($parts['host'] ?? '');

        return $host === 'images.plex.tv';
    }

    private function extractMetaContent(string $html, string $property): ?string
    {
        $propertyPattern = preg_quote($property, '#');

        if (preg_match(
            '#<meta\b[^>]*\bproperty=["\']'.$propertyPattern.'["\'][^>]*\bcontent=["\']([^"\']*)["\'][^>]*>#i',
            $html,
            $m
        ) === 1) {
            return $m[1];
        }

        if (preg_match(
            '#<meta\b[^>]*\bcontent=["\']([^"\']*)["\'][^>]*\bproperty=["\']'.$propertyPattern.'["\'][^>]*>#i',
            $html,
            $m
        ) === 1) {
            return $m[1];
        }

        return null;
    }

    private function extractTagText(string $html, string $tag): ?string
    {
        $tagPattern = preg_quote($tag, '#');

        if (preg_match('#<'.$tagPattern.'\b[^>]*>(.*?)</'.$tagPattern.'>#is', $html, $m) === 1) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5);
        }

        return null;
    }
}
