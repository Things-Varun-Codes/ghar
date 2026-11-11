<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use App\MiniApps\Mailbox\Http\Requests\Concerns\ValidatesRecipients;
use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
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
            'body' => ['required', 'string', 'max:600'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...$this->recipientMessages(),
            'body.required' => 'Write something first.',
            'body.max' => "Notes can't be longer than 600 characters.",
        ];
    }
}
