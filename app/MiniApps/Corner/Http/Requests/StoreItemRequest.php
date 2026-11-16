<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Support\ItemRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string|object>> */
    public function rules(): array
    {
        return ItemRules::for($this->list()->kind);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ItemRules::messages($this->list()->kind);
    }

    private function list(): CornerList
    {
        /** @var CornerList */
        return $this->route('list');
    }
}
