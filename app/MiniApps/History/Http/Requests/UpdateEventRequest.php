<?php

namespace App\MiniApps\History\Http\Requests;

use App\MiniApps\History\Concerns\EventRequestRules;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    use EventRequestRules;

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('event'));
    }

    protected function isUpdate(): bool
    {
        return true;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'occurred_on.required' => 'Date is required.',
            'occurred_on.date' => 'Date must be a valid date.',
        ];
    }
}
