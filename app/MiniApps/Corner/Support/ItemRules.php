<?php

namespace App\MiniApps\Corner\Support;

/** What an item may hold. Every part but a name (or a link to take one from) is optional. */
final class ItemRules
{
    /** The validation rule for an http(s) address. */
    public const WEB_URL = 'url:http,https';

    public static function isWebUrl(string $value): bool
    {
        return preg_match('#^https?://#i', $value) === 1;
    }

    /** Trimmed, or null when nothing is left. */
    public static function trimmed(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /** @return array<string, array<int, string>> */
    public static function all(): array
    {
        return [
            'title' => ['nullable', 'required_without:url', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'url' => ['nullable', 'string', self::WEB_URL, 'max:2048'],
            'image_url' => ['nullable', 'string', self::WEB_URL, 'max:2048'],
            // The picture was taken away on purpose, so a link's own isn't put back.
            'no_picture' => ['nullable', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public static function messages(): array
    {
        return [
            'title.required_without' => 'Give it a name, or paste a link to take one from.',
            'title.max' => 'Names are limited to 255 characters.',
            'notes.max' => 'Notes are limited to 2000 characters.',
            'url.url' => "That doesn't look like a web address.",
            'url.max' => 'Links are limited to 2048 characters.',
            'image_url.url' => "That doesn't look like the address of a picture.",
            'image_url.max' => 'Picture addresses are limited to 2048 characters.',
        ];
    }
}
