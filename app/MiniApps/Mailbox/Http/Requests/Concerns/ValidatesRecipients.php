<?php

namespace App\MiniApps\Mailbox\Http\Requests\Concerns;

use App\Shell\Services\Household;
use Illuminate\Validation\Rule;

/**
 * Sending to yourself is refused: every Mailbox surface splits into Sent and Received, and a
 * self-addressed item would sit in both.
 */
trait ValidatesRecipients
{
    /** @return array<string, array<int, mixed>> */
    protected function recipientRules(): array
    {
        $allowed = app(Household::class)->othersThan($this->user())->modelKeys();

        return [
            'recipient_ids' => ['required', 'array', 'min:1'],
            'recipient_ids.*' => ['required', 'integer', 'distinct', Rule::in($allowed)],
        ];
    }

    /** @return array<string, string> */
    protected function recipientMessages(): array
    {
        return [
            'recipient_ids.required' => 'Choose who it is for.',
            'recipient_ids.min' => 'Choose who it is for.',
            'recipient_ids.*.in' => 'You can only send to other people in your household.',
            'recipient_ids.*.distinct' => 'Each person can only be chosen once.',
        ];
    }

    /** @return list<int> */
    public function recipientIds(): array
    {
        return array_values(array_map('intval', (array) $this->validated('recipient_ids')));
    }
}
