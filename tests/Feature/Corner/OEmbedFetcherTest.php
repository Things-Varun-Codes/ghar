<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\OEmbedFetcher;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
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

    /** @return array<string, array{string}> */
    public static function urlsOutsideTheAllowlist(): array
    {
        return [
            'another site' => ['https://example.com/not-music'],
            'youtube playlist' => ['https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMt9H1mGQc8TfQRYbN'],
            'spotify playlist' => ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'],
            'spotify artist' => ['https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d'],
            'youtube host spoofed as a subdomain' => ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'],
            'spotify host spoofed as a subdomain' => ['https://open.spotify.com.evil.com/track/abc123'],
            'provider name in the path' => ['https://evil.com/open.spotify.com/track/abc123'],
        ];
    }

    #[DataProvider('urlsOutsideTheAllowlist')]
    public function test_a_url_outside_the_allowlist_is_rejected_before_any_request(string $url): void
    {
        Http::fake();

        $this->assertNull($this->fetcher->fetch($url));

        Http::assertNothingSent();
    }
}
