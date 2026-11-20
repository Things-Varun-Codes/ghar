<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\CornerList;
use App\Shell\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateList
{
    /** Words the room's own routes use at the same depth as a list's slug. */
    public const RESERVED_SLUGS = ['lists', 'items'];

    private const ATTEMPTS = 3;

    /** @param  array<string, mixed>  $data validated by SaveListRequest */
    public function __invoke(array $data, User $creator): CornerList
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(fn (): CornerList => CornerList::create([
                    'name' => $data['name'],
                    'slug' => $this->slugFor((string) $data['name']),
                    'icon' => $data['icon'],
                    'done_label' => $data['done_label'],
                    'todo_label' => $data['todo_label'],
                    'done_icon' => $data['done_icon'],
                    'notify_on_add' => (bool) $data['notify_on_add'],
                    'done_per_person' => (bool) ($data['done_per_person'] ?? false),
                    'position' => CornerList::query()->exists()
                        ? (int) CornerList::query()->max('position') + 1
                        : 0,
                    'created_by_user_id' => $creator->id,
                ]));
            } catch (UniqueConstraintViolationException $e) {
                // Two people made a list with the same name at the same moment.
                if ($attempt >= self::ATTEMPTS) {
                    throw $e;
                }
            }
        }
    }

    /**
     * Readable and fixed for the life of the list. A name with no Latin letters still gets a
     * usable address.
     */
    public function slugFor(string $name): string
    {
        $base = Str::limit(Str::slug($name), 70, '');
        $base = trim($base, '-');

        if ($base === '' || in_array($base, self::RESERVED_SLUGS, true)) {
            $base = $base === '' ? 'list' : "{$base}-list";
        }

        $taken = CornerList::query()
            ->where('slug', $base)
            ->orWhere('slug', 'like', "{$base}-%")
            ->pluck('slug')
            ->all();

        if (! in_array($base, $taken, true)) {
            return $base;
        }

        for ($n = 2; ; $n++) {
            if (! in_array("{$base}-{$n}", $taken, true)) {
                return "{$base}-{$n}";
            }
        }
    }
}
