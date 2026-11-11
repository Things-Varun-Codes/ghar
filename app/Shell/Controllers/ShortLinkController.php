<?php

namespace App\Shell\Controllers;

use App\Shell\Models\ShortLink;
use Illuminate\Http\RedirectResponse;

class ShortLinkController
{
    public function __invoke(string $code): RedirectResponse
    {
        $link = ShortLink::where('code', strtolower($code))->first();

        // Missing and disabled codes must 404 through the same condition, so a 404 never
        // confirms a code exists.
        if (! $link || ! $link->enabled) {
            abort(404);
        }

        // This is the kill switch's enforcement: a cached 302 would keep redirecting after
        // `enabled` is turned off.
        return redirect()->away($link->destination)
            ->header('Cache-Control', 'no-store, private');
    }
}
