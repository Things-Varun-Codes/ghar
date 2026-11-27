<?php

namespace App\MiniApps\Mailbox\Controllers\Concerns;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
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
     * @param  class-string<MailboxMessage|Postcard>  $model
     * @param  callable(MailboxMessage|Postcard): array<string, mixed>  $present
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
        $tabs = [
            'received' => $model::query()->receivedBy($viewer),
            'sent' => $model::query()->where('sender_id', $viewer->id),
        ];

        if ($tab === 'received') {
            $model::markAllReadFor($viewer);
        }

        $list = ListPage::make($request, (clone $tabs[$tab])->with(['sender', 'recipients']), ListPage::chronological('posted_at'))
            ->searchable([$searchColumn]);

        return Inertia::render($page, [
            ...$list->props($prop, 50, $present),
            'tab' => $tab,
            'tabCounts' => array_map(fn ($query): int => $list->countOf($query), $tabs),
            'members' => $household->optionsFor($viewer),
        ]);
    }
}
