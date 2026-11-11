<?php

namespace App\MiniApps\Corner\Rules;

use App\MiniApps\Corner\Services\PlexMetadataFetcher;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PlexUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! PlexMetadataFetcher::isAllowedHost((string) $value)) {
            $fail('That must be a Plex link (plex.tv).');
        }
    }
}
