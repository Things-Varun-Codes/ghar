<?php

namespace App\MiniApps\Mailbox\Support;

/** Whether this install can make pictures, read from the IMAGE_AI_* settings. */
final class ImageAi
{
    public const OPENAI = 'openai';

    public const CLOUDFLARE = 'cloudflare';

    public const FAKE = 'fake';

    /** Unset means the placeholder in development and tests, and nothing anywhere else. */
    public static function provider(): ?string
    {
        $provider = config('services.image_ai.provider');

        if (blank($provider)) {
            return app()->environment(['local', 'testing']) ? self::FAKE : null;
        }

        return (string) $provider;
    }

    /** What the admin is told when postcards can't be turned on; null when they can. */
    public static function missing(): ?string
    {
        $provider = self::provider();

        if ($provider === self::FAKE) {
            return null;
        }

        if ($provider === null) {
            return 'Needs an image model. Set IMAGE_AI_PROVIDER, IMAGE_AI_URL and IMAGE_AI_MODEL on the server, then restart it.';
        }

        if (! in_array($provider, [self::OPENAI, self::CLOUDFLARE], true)) {
            return 'IMAGE_AI_PROVIDER on the server must be openai, cloudflare or fake.';
        }

        // A model server on the home's own network often takes no key.
        $required = $provider === self::CLOUDFLARE ? ['url', 'key', 'model'] : ['url', 'model'];
        $unset = array_filter($required, fn (string $name): bool => blank(config("services.image_ai.{$name}")));

        if ($unset === []) {
            return null;
        }

        $names = implode(', ', array_map(fn (string $name): string => 'IMAGE_AI_'.strtoupper($name), $unset));

        return "Needs an image model. Still to set on the server: {$names}.";
    }
}
