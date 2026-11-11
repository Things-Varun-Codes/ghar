<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\Activity;
use Illuminate\Support\Facades\Gate;

class ActivityResource
{
    /**
     * @return array{
     *     id: int,
     *     title: string,
     *     notes: string|null,
     *     added_at: string,
     *     done_at: string|null,
     *     is_done: bool,
     *     can: array{update: bool, delete: bool},
     *     added_by_user_id: int,
     *     addedBy: array{id: int, name: string},
     * }
     */
    public function __invoke(Activity $activity): array
    {
        $activity->loadMissing('addedBy');

        return [
            'id' => $activity->id,
            'title' => $activity->title,
            'notes' => $activity->notes,
            'added_at' => $activity->added_at->toIso8601String(),
            'done_at' => $activity->done_at?->toIso8601String(),
            'is_done' => $activity->done_at !== null,
            'can' => [
                'update' => Gate::allows('update', $activity),
                'delete' => Gate::allows('delete', $activity),
            ],
            'added_by_user_id' => $activity->added_by_user_id,
            'addedBy' => [
                'id' => $activity->addedBy->id,
                'name' => $activity->addedBy->name,
            ],
        ];
    }
}
