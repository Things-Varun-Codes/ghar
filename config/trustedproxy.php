<?php

use App\Shell\Support\TrustedProxies;

// Laravel's TrustProxies middleware reads `proxies`; `ghar:proxy-config` reads both for nginx.
// See DEPLOY.md "Reverse proxy and client IPs".
return [
    'proxies' => TrustedProxies::parse(env('TRUSTED_PROXIES')),
    'cloudflare' => TrustedProxies::includesCloudflare(env('TRUSTED_PROXIES')),
];
