<?php

namespace App\MiniApps\Corner\Support;

use App\MiniApps\Corner\Rules\PlexUrl;

/** What an item may hold, by the kind of list it is in. Shared by add and edit. */
final class ItemRules
{
    /** @return array<string, array<int, string|object>> */
    public static function for(ListKind $kind): array
    {
        $notes = ['notes' => ['nullable', 'string', 'max:2000']];
        $title = ['title' => ['required', 'string', 'max:255']];

        return $notes + match ($kind) {
            ListKind::Link => [
                'url' => ['required', 'string', 'url', 'max:2048'],
                // Empty means "use what the link says it is".
                'title' => ['nullable', 'string', 'max:255'],
            ],
            ListKind::Poster => $title + [
                'url' => ['nullable', 'string', 'url', 'max:2048', new PlexUrl],
            ],
            ListKind::Place => $title + [
                'place_id' => ['nullable', 'string', 'max:255'],
                'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:-90,90'],
                'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:-180,180'],
                'address' => ['nullable', 'string', 'max:1024'],
            ],
            ListKind::Plain => $title,
        };
    }

    /** @return array<string, string> */
    public static function messages(ListKind $kind): array
    {
        return [
            'title.required' => $kind === ListKind::Place ? 'Give the place a name.' : 'Give it a title.',
            'title.max' => 'Titles are limited to 255 characters.',
            'notes.max' => 'Notes are limited to 2000 characters.',
            'url.required' => 'Paste a link to add it.',
            'url.url' => $kind === ListKind::Poster
                ? "That doesn't look like a Plex link."
                : "That doesn't look like a link.",
            'url.max' => 'Links are limited to 2048 characters.',
        ];
    }
}
