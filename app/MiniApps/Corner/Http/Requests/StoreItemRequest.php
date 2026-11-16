<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Support\ItemRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return ItemRules::all();
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ItemRules::messages();
    }
}
