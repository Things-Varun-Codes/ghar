<?php

namespace App\MiniApps\History\Http\Requests;

use App\MiniApps\History\Models\EventComment;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The global TrimStrings and ConvertEmptyStringsToNull middleware run first, so a blank
 * comment arrives as null and fails `required`.
 */
class StoreCommentRequest extends FormRequest
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:'.EventComment::MAX_LENGTH],
        ];
    }
}
