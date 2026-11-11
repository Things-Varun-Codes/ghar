<?php

namespace App\MiniApps\History\Http\Requests;

use App\MiniApps\History\Concerns\EventRequestRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    use EventRequestRules;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'occurred_on.required' => 'Pick a date.',
            'occurred_on.date' => "That date doesn't look valid.",
        ];
    }
}
