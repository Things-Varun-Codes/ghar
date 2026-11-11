<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateBouquetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $validKeys = array_column(config('mailbox-bouquets', []), 'key');

        return [
            'flowers' => ['required', 'array', 'min:1', 'max:5'],
            'flowers.*' => ['required', 'string', Rule::in($validKeys)],
            'refine' => ['nullable', 'string', 'max:300'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'flowers.required' => 'Choose at least one flower.',
            'flowers.min' => 'Choose at least one flower.',
            'flowers.max' => 'You can choose up to 5 flowers.',
            'flowers.*.in' => 'One or more selected flowers are not in the catalog.',
        ];
    }
}
