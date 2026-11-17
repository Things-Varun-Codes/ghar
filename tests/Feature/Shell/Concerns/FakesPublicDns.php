<?php

namespace Tests\Feature\Shell\Concerns;

use App\Shell\Support\Http\SafeFetcher;

trait FakesPublicDns
{
    /**
     * Every host resolves to one public address, so SafeFetcher lets the fetch through to
     * Http::fake without a DNS lookup.
     */
    protected function publicDns(string $address = '93.184.216.34'): void
    {
        $this->app->instance(SafeFetcher::class, new SafeFetcher(fn (): array => [$address]));
    }
}
