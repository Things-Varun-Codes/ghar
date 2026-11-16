<?php

namespace App\MiniApps\Corner\Support;

/** What an item may hold. Every part but a name (or a link to take one from) is optional. */
final class ItemRules
{
    /** @return array<string, array<int, string>> */
    public static function all(): array
    {
        return [
            'title' => ['nullable', 'required_without:url', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'url' => ['nullable', 'string', 'url:http,https', 'max:2048'],
            'image_url' => ['nullable', 'string', 'url:http,https', 'max:2048'],
            // The picture was taken away on purpose, so a link's own isn't put back.
            'no_picture' => ['nullable', 'boolean'],
            'location' => ['nullable', 'string', 'max:2048'],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:-180,180'],
            'address' => ['nullable', 'string', 'max:1024'],
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
            'location.max' => 'Keep the place to 2048 characters.',
            'address.max' => 'Addresses are limited to 1024 characters.',
        ];
    }
}
