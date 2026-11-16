<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemRules;
use Illuminate\Foundation\Http\FormRequest;

/** Adding to a list (anyone) and changing an item (its adder or an admin). */
class SaveItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('item');

        return ! $item instanceof Item || $this->user()->can('update', $item);
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
