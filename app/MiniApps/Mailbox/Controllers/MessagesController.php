<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreateMessage;
use App\MiniApps\Mailbox\Actions\MarkMessagesRead;
use App\MiniApps\Mailbox\Http\Requests\StoreMessageRequest;
use App\MiniApps\Mailbox\Http\Resources\MessageResource;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Services\Household;
use App\Shell\Support\CursorList;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController
{
    use ResolvesListSort;

    /** @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>> */
    protected function sortOptions(): array
    {
        return [
            'recent' => [['posted_at', 'desc'], ['id', 'desc']],
            'oldest' => [['posted_at', 'asc'], ['id', 'asc']],
        ];
    }

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

        $sort = $this->resolveSort($request);
        $this->applyListOrder($base, $sort);
        $q = trim((string) $request->query('q')) ?: null;

        return Inertia::render('MiniApps/Mailbox/Pages/Messages', [
            'messages' => CursorList::make($base)
                ->searchable(['body'], $q)
                ->paginate('all', 50, fn (MailboxMessage $m) => app(MessageResource::class)($m, $viewer)),
            'tab' => $tab,
            'sort' => $sort,
            'q' => $q,
            'members' => $household->optionsFor($viewer),
            'catalog' => config('mailbox-bouquets'),
        ]);
    }

    public function store(StoreMessageRequest $request, CreateMessage $action): RedirectResponse
    {
        $action($request, $request->user());

        return redirect('/apps/our-mailbox/messages');
    }

    public function destroy(Request $request, MailboxMessage $message): RedirectResponse
    {
        Gate::authorize('delete', $message);

        $message->delete();

        return redirect()->back();
    }
}
