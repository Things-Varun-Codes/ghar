<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemRules;
use App\MiniApps\Corner\Support\ListKind;
use Illuminate\Foundation\Http\FormRequest;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('item'));
    }

    /** @return array<string, array<int, string|object>> */
    public function rules(): array
    {
        return ItemRules::for($this->kind());
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ItemRules::messages($this->kind());
    }

    private function kind(): ListKind
    {
        /** @var Item $item */
        $item = $this->route('item');

        return $item->list->kind;
    }
}
