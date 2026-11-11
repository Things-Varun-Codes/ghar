<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\StoreMessageRequest;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

/**
 * Pushes on the line after DB::transaction returns, so a rolled-back write sends nothing.
 */
class CreateMessage
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(StoreMessageRequest $request, User $sender): MailboxMessage
    {
        $validated = $request->validated();
        $recipientIds = $request->recipientIds();

        /** @var MailboxMessage $message */
        $message = DB::transaction(function () use ($validated, $sender, $recipientIds): MailboxMessage {
            $message = MailboxMessage::create([
                'sender_id' => $sender->id,
                'body' => $validated['body'],
                'posted_at' => now(),
            ]);
            $message->recipients()->attach($recipientIds);

            return $message;
        });

        $firstName = $sender->firstName();

        $this->dispatcher->toUsers(
            $message->recipients()->get(),
            'our-mailbox',
            'our-mailbox:messages',
            "You got a note from {$firstName}",
            "/apps/our-mailbox/messages?focus={$message->id}",
        );

        return $message;
    }
}
