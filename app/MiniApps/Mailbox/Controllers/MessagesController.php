<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreateMessage;
use App\MiniApps\Mailbox\Controllers\Concerns\ListsSentAndReceived;
use App\MiniApps\Mailbox\Http\Requests\StoreMessageRequest;
use App\MiniApps\Mailbox\Http\Resources\MessageResource;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Response;

class MessagesController
{
    use ListsSentAndReceived;

    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        return $this->sentAndReceived(
            $request, $household, MailboxMessage::class, 'MiniApps/Mailbox/Pages/Messages', 'messages', 'body',
            fn (MailboxMessage $m) => app(MessageResource::class)($m, $viewer),
        );
    }

    public function store(StoreMessageRequest $request, CreateMessage $action): RedirectResponse
    {
        $action($request, $request->user());

        FlashToast::success('Note sent.');

        return redirect('/apps/our-exchange/messages?tab=sent');
    }

    public function destroy(Request $request, MailboxMessage $message): RedirectResponse
    {
        Gate::authorize('delete', $message);

        $message->delete();

        FlashToast::success('Note deleted.');

        return redirect()->back();
    }
}
