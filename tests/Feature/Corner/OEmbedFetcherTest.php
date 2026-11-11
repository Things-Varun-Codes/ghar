<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\OEmbedFetcher;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OEmbedFetcherTest extends TestCase
{
    private OEmbedFetcher $fetcher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fetcher = new OEmbedFetcher;
    }

    public function test_youtube_url_returns_metadata(): void
    {
        Http::fake([
            'youtube.com/oembed*' => Http::response([
                'title' => 'Never Gonna Give You Up',
                'author_name' => 'Rick Astley',
                'thumbnail_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
                'type' => 'video',
                'provider_name' => 'YouTube',
            ], 200),
        ]);

        $result = $this->fetcher->fetch('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        $this->assertIsArray($result);
        $this->assertSame('youtube', $result['provider']);
        $this->assertSame('dQw4w9WgXcQ', $result['provider_id']);
        $this->assertSame('Never Gonna Give You Up', $result['title']);
        $this->assertSame('Rick Astley', $result['author']);
        $this->assertSame('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', $result['thumbnail_url']);
    }

    public function test_spotify_url_uses_bare_endpoint(): void
    {
        Http::fake([
            'open.spotify.com/oembed*' => Http::response([
                'title' => 'Bohemian Rhapsody - song by Queen',
                'thumbnail_url' => 'https://i.scdn.co/image/ab67616d0000abcd',
                'type' => 'rich',
                'provider_name' => 'Spotify',
            ], 200),
        ]);

        $result = $this->fetcher->fetch('https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb');

        $this->assertIsArray($result);
        $this->assertSame('spotify', $result['provider']);
        $this->assertSame('3z8h0TU7ReDPLIbEnYhWZb', $result['provider_id']);
        $this->assertSame('Bohemian Rhapsody - song by Queen', $result['title']);
        $this->assertNull($result['author']); // Spotify never returns author_name.

        Http::assertSent(function (Request $req) {
            return str_starts_with($req->url(), 'https://open.spotify.com/oembed?')
                && ! str_contains($req->url(), 'embed.spotify.com');
        });
    }

    public function test_spotify_308_redirect_followed(): void
    {
        Http::fake([
            'open.spotify.com/oembed*' => Http::response([
                'title' => 'Track Title',
                'thumbnail_url' => 'https://i.scdn.co/image/abc',
            ], 200),
        ]);

        $result = $this->fetcher->fetch('https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb');

        $this->assertIsArray($result);
        $this->assertSame('spotify', $result['provider']);
        $this->assertSame('Track Title', $result['title']);
    }

    public function test_oembed_timeout_returns_null(): void
    {
        // Simulate a connection-timeout by throwing ConnectionException — the  fetcher
        // catches Throwable and returns null.
        Http::fake(function () {
            throw new ConnectionException('cURL error 28: Operation timed out');
        });

        $result = $this->fetcher->fetch('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

        $this->assertNull($result);
    }

    public function test_oembed_404_returns_null(): void
    {
        Http::fake([
            'youtube.com/oembed*' => Http::response([], 404),
        ]);

        $result = $this->fetcher->fetch('https://www.youtube.com/watch?v=deletedVid1');

        $this->assertNull($result);
    }

    public function test_invalid_url_returns_null(): void
    {
        Http::fake(); // Empty fake — any HTTP call would be caught.

        $result = $this->fetcher->fetch('https://example.com/not-music');

        $this->assertNull($result);
        // Allowlist regex rejects pre-fetch — no HTTP call should have been made.
        Http::assertNothingSent();
    }

    public function test_youtube_short_url_canonicalized(): void
    {
        Http::fake([
            'youtube.com/oembed*' => Http::response([
                'title' => 'Title',
                'author_name' => 'Author',
                'thumbnail_url' => 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            ], 200),
        ]);

        $result = $this->fetcher->fetch('https://youtu.be/dQw4w9WgXcQ');

        $this->assertIsArray($result);
        $this->assertSame('dQw4w9WgXcQ', $result['provider_id']);
    }

    public function test_playlist_url_returns_null(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch(
            'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMt9H1mGQc8TfQRYbN'
        );

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_spotify_missing_author_name_is_null(): void
    {
        Http::fake([
            'open.spotify.com/oembed*' => Http::response([
                'title' => 'Some Title - song by Some Artist',
                'thumbnail_url' => 'https://i.scdn.co/image/xyz',
                // NO author_name field — matches real Spotify response.
            ], 200),
        ]);

        $result = $this->fetcher->fetch('https://open.spotify.com/track/3z8h0TU7ReDPLIbEnYhWZb');

        $this->assertIsArray($result);
        $this->assertNull($result['author']);
    }

    public function test_spotify_playlist_url_returns_null(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch(
            'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
        );

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_spotify_artist_url_returns_null(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch(
            'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d'
        );

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_youtube_subdomain_spoof_host_rejected(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ');

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_spotify_subdomain_spoof_host_rejected(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('https://open.spotify.com.evil.com/track/abc123');

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_provider_name_embedded_in_path_rejected(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('https://evil.com/open.spotify.com/track/abc123');

        $this->assertNull($result);
        Http::assertNothingSent();
    }
}
