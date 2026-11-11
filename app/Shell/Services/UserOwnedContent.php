<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Registry of the mini-app tables whose user foreign keys RESTRICT. Lets the admin delete
 * refuse with a message naming what blocks it, instead of the FK surfacing as a 500. Mini
 * apps register from their provider's boot(), so a disabled app's tables are never queried.
 */
class UserOwnedContent
{
    /** @var array<string, array{columns: list<string>, label: string}> */
    private array $tables = [];

    /** @param  list<string>  $columns */
    public function register(string $table, array $columns, string $label): void
    {
        $this->tables[$table] = ['columns' => $columns, 'label' => $label];
    }

    /** @return array<string, int> */
    public function summaryFor(User $user): array
    {
        $summary = [];

        foreach ($this->tables as $table => ['columns' => $columns, 'label' => $label]) {
            $count = DB::table($table)
                ->where(function ($query) use ($columns, $user) {
                    foreach ($columns as $column) {
                        $query->orWhere($column, $user->id);
                    }
                })
                ->count();

            if ($count > 0) {
                $summary[$label] = $count;
            }
        }

        return $summary;
    }
}
