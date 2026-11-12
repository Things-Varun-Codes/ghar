<?php

namespace App\MiniApps\Corner\Services;

use App\MiniApps\Corner\Support\HostAllowlist;
use Illuminate\Support\Facades\Http;
use Throwable;

class OEmbedFetcher
{
    private const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';

    /**
     * The legacy embed.spotify.com/oembed/ endpoint answers with a 308 loop; this bare
     * open.spotify.com URL is the only safe one.
     */
    private const SPOTIFY_OEMBED = 'https://open.spotify.com/oembed';

    private const TIMEOUT_SECONDS = 5;

    /**
     * @return array{provider: string, provider_id: string, title: string, author: ?string, thumbnail_url: ?string}|null
     */
    public function fetch(string $url): ?array
    {
        // SSRF guard: allowlist before the HTTP call.
        $provider = $this->detectProvider($url);
        if ($provider === null) {
            return null;
        }

        if ($this->shouldRejectUrl($url, $provider)) {
            return null;
        }

        $providerId = $this->extractProviderId($url, $provider);
        if ($providerId === null) {
            return null;
        }

        $endpoint = $provider === 'youtube'
            ? self::YOUTUBE_OEMBED
            : self::SPOTIFY_OEMBED;

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->withOptions(['allow_redirects' => HostAllowlist::redirectOptions(['youtube.com', 'spotify.com'])])
                ->get($endpoint, [
                    'url' => $url,
                    'format' => 'json',
                ]);

            if (! $response->ok()) {
                report(new \RuntimeException(
                    sprintf('oEmbed failure for %s: status %d', $url, $response->status())
                ));

                return null;
            }

            $author = $provider === 'spotify'
                ? null
                : $response->json('author_name');

            return [
                'provider' => $provider,
                'provider_id' => $providerId,
                'title' => $response->json('title') ?? $url,
                'author' => $author,
                'thumbnail_url' => $response->json('thumbnail_url'),
            ];
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }

    private function detectProvider(string $url): ?string
    {
        if (HostAllowlist::matches($url, ['youtube.com', 'youtu.be'])) {
            return 'youtube';
        }

        if (HostAllowlist::matches($url, ['open.spotify.com', 'spotify.link'])) {
            return 'spotify';
        }

        return null;
    }

    /**
     * A playlist or album would persist as one row that misrepresents what was shared.
     */
    private function shouldRejectUrl(string $url, string $provider): bool
    {
        if ($provider === 'youtube') {
            if (preg_match('#youtube\.com/playlist#i', $url) === 1) {
                return true;
            }
        }

        if ($provider === 'spotify') {
            if (preg_match('#open\.spotify\.com/(?:[a-z-]+/)?(?:playlist|artist|album|show|episode)/#i', $url) === 1) {
                return true;
            }
        }

        return false;
    }

    private function extractProviderId(string $url, string $provider): ?string
    {
        if ($provider === 'youtube') {
            if (preg_match('#[?&]v=([A-Za-z0-9_-]{11})#', $url, $m) === 1) {
                return $m[1];
            }

            if (preg_match('#youtu\.be/([A-Za-z0-9_-]{11})#', $url, $m) === 1) {
                return $m[1];
            }

            if (preg_match('#youtube\.com/shorts/([A-Za-z0-9_-]{11})#', $url, $m) === 1) {
                return $m[1];
            }

            if (preg_match('#youtube\.com/embed/([A-Za-z0-9_-]{11})#', $url, $m) === 1) {
                return $m[1];
            }

            return null;
        }

        if ($provider === 'spotify') {
            if (preg_match('#open\.spotify\.com/(?:[a-z-]+/)?track/([A-Za-z0-9]+)#i', $url, $m) === 1) {
                return $m[1];
            }

            // The canonical track id would need following the 302, which is more network than
            // a pre-fetch should do. The unique constraint works on shortcodes too.
            if (preg_match('#spotify\.link/([A-Za-z0-9]+)#', $url, $m) === 1) {
                return $m[1];
            }

            return null;
        }

        return null;
    }
}
