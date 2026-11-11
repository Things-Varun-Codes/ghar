<?php

namespace App\MiniApps\Corner\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSongRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('song'));
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'url' => ['required', 'string', 'url', 'max:2048'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'url.required' => 'Paste a link to add a song.',
            'url.url' => "That doesn't look like a YouTube or Spotify link.",
            'url.max' => 'That link is too long.',
        ];
    }
}
