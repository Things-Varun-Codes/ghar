<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ItemDetails;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateItem
{
    public function __construct(
        private readonly ItemDetails $details,
    ) {}

    /** @param  array<string, mixed>  $data validated by ItemRules */
    public function __invoke(Item $item, array $data): Item
    {
        $attributes = $this->details->for($data, $item);

        try {
            DB::transaction(fn () => $item->update($attributes));
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['url' => ItemDetails::DUPLICATE_LINK]);
        }

        return $item;
    }
}
