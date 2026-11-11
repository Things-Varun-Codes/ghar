<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use App\MiniApps\Mailbox\Http\Requests\Concerns\ValidatesRecipients;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBouquetRequest extends FormRequest
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
        $validKeys = array_column(config('mailbox-bouquets', []), 'key');
        $allowedMimes = array_keys(self::MIME_EXTENSION_MAP);

        return [
            ...$this->recipientRules(),
            'flowers' => ['required', 'array', 'min:1', 'max:5'],
            'flowers.*' => ['required', 'string', Rule::in($validKeys)],
            'note' => ['nullable', 'string', 'max:600'],
            'image' => [
                'required',
                'string',
                'max:'.(int) ceil(self::MAX_BYTES / 3) * 4,
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || self::decodeImage($value) === null) {
                        $fail('The bouquet image could not be read.');
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
            'flowers.required' => 'Choose at least one flower.',
            'flowers.min' => 'Choose at least one flower.',
            'flowers.max' => 'You can choose up to 5 flowers.',
            'flowers.*.in' => 'One or more selected flowers are not in the catalog.',
            'image.required' => 'No bouquet image was provided.',
            'image.max' => 'The bouquet image is too large (max 10 MB).',
            'mime.required' => 'Image type is required.',
            'mime.in' => 'Unsupported image type.',
        ];
    }
}
