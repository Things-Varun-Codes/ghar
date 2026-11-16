<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\IssueCitation;
use App\MiniApps\Mailbox\Actions\PayCitation;
use App\MiniApps\Mailbox\Http\Requests\IssueCitationRequest;
use App\MiniApps\Mailbox\Http\Resources\CitationResource;
use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Services\Household;
use App\Shell\Support\CursorList;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CitationsController
{
    use ResolvesListSort;

    /** @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>> */
    protected function sortOptions(): array
    {
        return [
            'recent' => [['issued_at', 'desc'], ['id', 'desc']],
            'oldest' => [['issued_at', 'asc'], ['id', 'asc']],
        ];
    }

    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        $tab = $request->query('tab') === 'issued' ? 'issued' : 'received';
        $sideColumn = $tab === 'issued' ? 'issuer_id' : 'recipient_id';

        $base = Citation::query()
            ->visibleTo($viewer)
            ->where($sideColumn, $viewer->id)
            ->with(['issuer', 'recipient']);

        $sort = $this->resolveSort($request);
        $this->applyListOrder($base, $sort);
        $q = trim((string) $request->query('q')) ?: null;

        return Inertia::render('MiniApps/Mailbox/Pages/Citations/Index', [
            'citations' => CursorList::make($base)
                ->searchable(['offence', 'penalty', 'incident_place', 'remarks'], $q)
                ->paginate('all', 50, fn (Citation $c) => app(CitationResource::class)($c)),
            'tab' => $tab,
            'sort' => $sort,
            'q' => $q,
            'members' => $household->optionsFor($viewer),
        ]);
    }

    public function show(Request $request, Citation $citation): Response
    {
        Gate::authorize('view', $citation);

        $citation->load(['issuer', 'recipient']);

        return Inertia::render('MiniApps/Mailbox/Pages/Citations/Show', [
            'citation' => app(CitationResource::class)($citation),
        ]);
    }

    public function store(IssueCitationRequest $request, IssueCitation $action): RedirectResponse
    {
        $citations = $action($request, $request->user());

        if ($citations->count() === 1) {
            FlashToast::success('Citation issued.');

            return redirect()->route('apps.our-mailbox.citations.show', $citations->first());
        }

        FlashToast::success("{$citations->count()} citations issued.");

        return redirect()->route('apps.our-mailbox.citations.index', ['tab' => 'issued']);
    }

    public function pay(Request $request, Citation $citation, PayCitation $action): RedirectResponse
    {
        Gate::authorize('pay', $citation);

        $action($citation, $request->user());

        FlashToast::success('Citation paid.');

        return redirect()->back();
    }

    public function destroy(Request $request, Citation $citation): RedirectResponse
    {
        Gate::authorize('delete', $citation);

        $citation->delete();

        FlashToast::success('Citation withdrawn.');

        return redirect()
            ->route('apps.our-mailbox.citations.index');
    }
}
