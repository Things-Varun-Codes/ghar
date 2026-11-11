<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Rules\PlexUrl;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMovieRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('movie'));
    }

    /** @return array<string, array<int, string|object>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'plex_url' => ['nullable', 'url', 'max:2048', new PlexUrl],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'Add a title for the movie.',
            'title.max' => 'That title is too long.',
            'plex_url.url' => "That doesn't look like a valid Plex link.",
            'plex_url.max' => 'That Plex link is too long.',
        ];
    }
}
