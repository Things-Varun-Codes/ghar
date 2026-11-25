<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePostcardRequest extends FormRequest
{
    public const PROMPT_MAX = 1000;

    public const PROMPT_RULES = ['required', 'string', 'max:'.self::PROMPT_MAX];

    public const PROMPT_MESSAGES = [
        'prompt.required' => 'Say what the picture should show.',
        'prompt.max' => 'Keep the prompt under 1000 characters.',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['prompt' => self::PROMPT_RULES];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return self::PROMPT_MESSAGES;
    }
}
