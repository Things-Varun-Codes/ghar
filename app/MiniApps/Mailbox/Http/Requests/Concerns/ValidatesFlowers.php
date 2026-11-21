<?php

namespace App\MiniApps\Mailbox\Http\Requests\Concerns;

use Illuminate\Validation\Rule;

trait ValidatesFlowers
{
    /** @return array<string, array<int, mixed>> */
    protected function flowerRules(): array
    {
        return [
            'flowers' => ['required', 'array', 'min:1', 'max:5'],
            'flowers.*' => ['required', 'string', Rule::in(array_column(config('mailbox-bouquets', []), 'key'))],
        ];
    }

    /** @return array<string, string> */
    protected function flowerMessages(): array
    {
        return [
            'flowers.required' => 'Choose at least one flower.',
            'flowers.min' => 'Choose at least one flower.',
            'flowers.max' => 'You can choose up to 5 flowers.',
            'flowers.*.in' => 'One or more selected flowers are not in the catalog.',
        ];
    }
}
