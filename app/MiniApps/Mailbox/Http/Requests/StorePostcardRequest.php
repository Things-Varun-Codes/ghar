<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use App\MiniApps\Mailbox\Http\Requests\Concerns\ValidatesRecipients;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostcardRequest extends FormRequest
{
    use ValidatesRecipients;

    public const MIME_EXTENSION_MAP = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_BYTES = 10 * 1024 * 1024;

    /** @return array{bytes: string, mime: string}|null null unless it is an allowlisted image */
    public static function decodeImage(string $base64): ?array
    {
        $bytes = base64_decode($base64, strict: true);

        if ($bytes === false || $bytes === '') {
            return null;
        }

        // @: emits a notice for bytes it can't parse, which is the expected case here.
        $mime = (@getimagesizefromstring($bytes) ?: [])['mime'] ?? null;

        return isset(self::MIME_EXTENSION_MAP[$mime]) ? ['bytes' => $bytes, 'mime' => $mime] : null;
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $allowedMimes = array_keys(self::MIME_EXTENSION_MAP);

        return [
            ...$this->recipientRules(),
            'prompt' => GeneratePostcardRequest::PROMPT_RULES,
            'note' => ['nullable', 'string', 'max:600'],
            'image' => [
                'required',
                'string',
                'max:'.(int) ceil(self::MAX_BYTES / 3) * 4,
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || self::decodeImage($value) === null) {
                        $fail('The postcard image could not be read. Make it again.');
                    }
                },
            ],
            'mime' => ['required', 'string', Rule::in($allowedMimes)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            ...$this->recipientMessages(),
            ...GeneratePostcardRequest::PROMPT_MESSAGES,
            'image.required' => 'Make the picture before you send it.',
            'image.max' => 'The postcard image is too large (max 10 MB).',
            'mime.required' => 'Image type is required.',
            'mime.in' => 'Unsupported image type.',
        ];
    }
}
