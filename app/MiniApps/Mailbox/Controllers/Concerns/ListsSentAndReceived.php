<?php

namespace App\MiniApps\Mailbox\Controllers\Concerns;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Services\Household;
use App\Shell\Support\ListPage;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

trait ListsSentAndReceived
{
    /**
     * Opening Received marks it all read.
     *
     * @param  class-string<MailboxMessage|Bouquet>  $model
     * @param  callable(MailboxMessage|Bouquet): array<string, mixed>  $present
     */
    private function sentAndReceived(
        Request $request,
        Household $household,
        string $model,
        string $page,
        string $prop,
        string $searchColumn,
        callable $present,
    ): Response {
        $viewer = $request->user();
        $tab = $request->query('tab') === 'sent' ? 'sent' : 'received';
        $base = $model::query()->with(['sender', 'recipients']);

        if ($tab === 'received') {
            $model::markAllReadFor($viewer);
            $base->receivedBy($viewer);
        } else {
            $base->where('sender_id', $viewer->id);
        }

        return Inertia::render($page, [
            ...ListPage::make($request, $base, ListPage::chronological('posted_at'))
                ->searchable([$searchColumn])
                ->props($prop, 50, $present),
            'tab' => $tab,
            'members' => $household->optionsFor($viewer),
        ]);
    }
}
