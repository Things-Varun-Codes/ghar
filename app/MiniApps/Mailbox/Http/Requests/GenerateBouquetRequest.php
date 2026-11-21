<?php

namespace App\MiniApps\Mailbox\Http\Requests;

use App\MiniApps\Mailbox\Http\Requests\Concerns\ValidatesFlowers;
use Illuminate\Foundation\Http\FormRequest;

class GenerateBouquetRequest extends FormRequest
{
    use ValidatesFlowers;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...$this->flowerRules(),
            'refine' => ['nullable', 'string', 'max:300'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->flowerMessages();
    }
}
