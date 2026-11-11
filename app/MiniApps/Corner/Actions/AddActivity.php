<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Activity;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class AddActivity
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    /** @param  array{title: string, notes?: string|null}  $data */
    public function __invoke(array $data, User $adder): Activity
    {
        return DB::transaction(function () use ($data, $adder): Activity {
            $activity = Activity::create([
                'title' => $data['title'],
                'notes' => $data['notes'] ?? null,
                'added_by_user_id' => $adder->id,
                'added_at' => now(),
            ]);

            if (config('corner-lists.activities.push_on_add', true)) {
                $firstName = $adder->firstName();
                $body = "{$firstName} added an activity: {$activity->title}";

                DB::afterCommit(function () use ($adder, $body): void {
                    $this->dispatcher->toHousehold(
                        $adder,
                        'our-corner',
                        'our-corner:activities',
                        $body,
                        '/apps/our-corner/activities',
                    );
                });
            }

            return $activity;
        });
    }
}
