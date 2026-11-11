<?php

namespace App\MiniApps\History\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('attachMedia', $this->route('event'));
    }

    public function rules(): array
    {
        return [
            'media' => ['required', 'file'],
            'poster' => ['sometimes', 'file', 'image', 'max:5120'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->has('media')) {
                return;
            }

            $file = $this->file('media');
            if (! $file) {
                return;
            }

            $mime = $file->getMimeType() ?? '';
            $sizeKb = $file->getSize() / 1024;
            $ext = strtolower($file->getClientOriginalExtension());

            if (str_starts_with($mime, 'video/')) {
                if ($sizeKb > 102400) {
                    $v->errors()->add('media', "That video's too big. Keep videos under 100 MB.");

                    return;
                }

                $allowedVideoExts = ['mp4', 'mov', 'webm', 'qt'];
                if (! in_array($ext, $allowedVideoExts, true)) {
                    $v->errors()->add('media', "That file type isn't supported.");
                }
            } else {
                // No SVG: it can carry script.
                $allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
                if (! in_array($ext, $allowedImageExts, true)) {
                    $v->errors()->add('media', "That file type isn't supported.");

                    return;
                }

                if ($sizeKb > 20480) {
                    $v->errors()->add('media', "That photo's too big. Keep photos under 20 MB.");
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'media.required' => 'Pick a file to upload.',
            'media.file' => "That doesn't look like a valid file.",
        ];
    }
}
