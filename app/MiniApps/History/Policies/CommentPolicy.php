<?php

namespace App\MiniApps\History\Policies;

use App\MiniApps\History\Models\EventComment;
use App\Shell\Models\User;

class CommentPolicy
{
    public function delete(User $user, EventComment $comment): bool
    {
        return $user->makerOrAdmin($comment->author_id);
    }
}
