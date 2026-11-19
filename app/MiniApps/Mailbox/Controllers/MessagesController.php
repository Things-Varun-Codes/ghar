<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreateMessage;
use App\MiniApps\Mailbox\Actions\MarkMessagesRead;
use App\MiniApps\Mailbox\Http\Requests\StoreMessageRequest;
use App\MiniApps\Mailbox\Http\Resources\MessageResource;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ListPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController
{
    public function index(Request $request, MarkMessagesRead $markRead, Household $household): Response
    {
        $viewer = $request->user();
        $tab = $request->query('tab') === 'sent' ? 'sent' : 'received';

        if ($tab === 'received') {
            $markRead($viewer);
        }

        $base = MailboxMessage::query()
            ->with(['sender', 'recipients']);

        if ($tab === 'received') {
            $base->receivedBy($viewer);
        } else {
            $base->where('sender_id', $viewer->id);
        }

        return Inertia::render('MiniApps/Mailbox/Pages/Messages', [
            ...ListPage::make($request, $base, ListPage::chronological('posted_at'))
                ->searchable(['body'])
                ->props('messages', 50, fn (MailboxMessage $m) => app(MessageResource::class)($m, $viewer)),
            'tab' => $tab,
            'members' => $household->optionsFor($viewer),
            'catalog' => config('mailbox-bouquets'),
        ]);
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
