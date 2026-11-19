<?php

namespace App\MiniApps\History\Concerns;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Support\OnThisDay;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Validator;
use Throwable;

trait EventRequestRules
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->isUpdate()
                ? ['sometimes', 'required', 'date']
                : ['required', 'date'],
            'title' => ['nullable', 'string', 'max:200'],
            'location_freetext' => ['nullable', 'string', 'max:200'],
            'location_place_id' => ['nullable', 'string', 'max:255'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'location_address' => ['nullable', 'string', 'max:255'],
            'location_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'location_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'body_html' => ['nullable', 'string', 'max:50000'],
            'birthday_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['occurred_on', 'birthday_user_id'])) {
                    return;
                }

                $memberId = $this->input('birthday_user_id');
                $date = $this->momentDate();

                if ($memberId === null || $date === null) {
                    return;
                }

                $member = User::query()->find((int) $memberId);

                if ($member !== null && ($member->birthday === null || ! OnThisDay::sameDayOfYear($member->birthday, $date))) {
                    $validator->errors()->add('birthday_user_id', "That date isn't {$member->firstName()}'s birthday.");
                }
            },
        ];
    }

    protected function isUpdate(): bool
    {
        return false;
    }

    /** The date the moment will have: the one sent, else (on an edit) the one it has. */
    private function momentDate(): ?CarbonImmutable
    {
        $sent = $this->input('occurred_on');

        if ($sent !== null) {
            try {
                return CarbonImmutable::parse((string) $sent);
            } catch (Throwable) {
                return null;
            }
        }

        $event = $this->route('event');

        return $event instanceof Event ? CarbonImmutable::parse($event->occurred_on) : null;
    }
}
