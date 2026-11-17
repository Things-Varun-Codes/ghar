<?php

namespace App\MiniApps\Corner\Http\Resources;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Policies\CornerListPolicy;
use App\Shell\Models\User;

class ListResource
{
    /**
     * @param  int  $itemsByOthers  how many items in the list the viewer didn't add
     * @return array{
     *     id: int,
     *     slug: string,
     *     name: string,
     *     icon: string,
     *     done_label: string,
     *     todo_label: string,
     *     done_icon: string,
     *     notify_on_add: bool,
     *     can: array{update: bool, delete: bool},
     *     delete_needs_admin: bool,
     * }
     */
    public function __invoke(CornerList $list, User $viewer, int $itemsByOthers): array
    {
        $canUpdate = $viewer->can('update', $list);
        $canDelete = CornerListPolicy::mayDelete($viewer, $list, $itemsByOthers);

        return [
            'id' => $list->id,
            'slug' => $list->slug,
            'name' => $list->name,
            'icon' => $list->icon,
            'done_label' => $list->done_label,
            'todo_label' => $list->todo_label,
            'done_icon' => $list->done_icon,
            'notify_on_add' => $list->notify_on_add,
            'can' => ['update' => $canUpdate, 'delete' => $canDelete],
            // The viewer made this list but others have added to it since.
            'delete_needs_admin' => $canUpdate && ! $canDelete,
        ];
    }
}
