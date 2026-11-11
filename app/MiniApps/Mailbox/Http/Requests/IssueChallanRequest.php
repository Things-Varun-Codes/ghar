<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use App\MiniApps\Mailbox\Http\Requests\Concerns\ValidatesRecipients;
use Illuminate\Foundation\Http\FormRequest;

class IssueChallanRequest extends FormRequest
{
    use ValidatesRecipients;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            ...$this->recipientRules(),
            'offence' => ['required', 'string', 'max:120'],
            'incident_date' => ['nullable', 'date'],
            'incident_place' => ['nullable', 'string', 'max:120'],
            'is_repeat' => ['boolean'],
            'penalty' => ['required', 'string', 'max:80'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->recipientMessages();
    }
}
