<?php

namespace App\MiniApps\Corner\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePlaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string|int>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'place_id' => ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:-180,180'],
            'address' => ['nullable', 'string', 'max:1024'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'Give the place a name.',
            'title.max' => 'That title is too long.',
        ];
    }
}
