<?php

namespace App\MiniApps\Mailbox\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $prompt
 */
#[Fillable(['user_id', 'name', 'prompt'])]
class SavedPrompt extends Model
{
    protected $table = 'mailbox_saved_prompts';
}
