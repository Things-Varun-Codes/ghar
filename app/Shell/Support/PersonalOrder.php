<?php

namespace App\Shell\Support;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Each person puts a room's things in their own order; nobody else's changes. Until they do,
 * and for anything made since, the oldest comes first.
 */
final class PersonalOrder
{
    /**
     * Sorts `$query` the way `$user` ordered it, then oldest first.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public static function apply(Builder $query, User $user, string $scope): Builder
    {
        $model = $query->getModel();

        // Postgres sorts nulls last, so what the person hasn't placed yet follows what they have.
        return $query
            ->orderBy(DB::table('personal_orders')
                ->select('position')
                ->whereColumn('item_id', $model->getQualifiedKeyName())
                ->where('user_id', $user->id)
                ->where('scope', $scope))
            ->orderBy($model->qualifyColumn('created_at'))
            ->orderBy($model->getQualifiedKeyName());
    }

    /**
     * Saves `$ids` as `$user`'s order. `$rows` is everything they may order: the ids must be
     * exactly those, so nothing is dropped and nothing they can't see is placed.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $rows
     * @param  list<int>  $ids
     */
    public static function save(Builder $rows, User $user, string $scope, array $ids): void
    {
        DB::transaction(function () use ($rows, $user, $scope, $ids): void {
            $current = (clone $rows)->pluck($rows->getModel()->getQualifiedKeyName())->map(intval(...))->all();
            sort($current);
            $sent = $ids;
            sort($sent);

            // Something added or removed since the page loaded: saving would drop or misplace it.
            if ($current !== $sent) {
                throw ValidationException::withMessages(['ids' => 'Something changed while you were moving things. Try again.']);
            }

            DB::table('personal_orders')->where('user_id', $user->id)->where('scope', $scope)->delete();
            DB::table('personal_orders')->insert(array_map(
                fn (int $id, int $position): array => ['user_id' => $user->id, 'scope' => $scope, 'item_id' => $id, 'position' => $position],
                $ids,
                array_keys($ids),
            ));
        });
    }
}
