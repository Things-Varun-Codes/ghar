<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\IssueCitation;
use App\MiniApps\Mailbox\Actions\PayCitation;
use App\MiniApps\Mailbox\Http\Requests\IssueCitationRequest;
use App\MiniApps\Mailbox\Http\Resources\CitationResource;
use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ListPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CitationsController
{
    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        $tab = $request->query('tab') === 'issued' ? 'issued' : 'received';

        $base = Citation::query()->with(['issuer', 'recipient']);

        if ($tab === 'issued') {
            $base->issuedBy($viewer);
        } else {
            $base->receivedBy($viewer);
        }

        return Inertia::render('MiniApps/Mailbox/Pages/Citations/Index', [
            ...ListPage::make($request, $base, ListPage::chronological('issued_at'))
                ->searchable(['offence', 'penalty', 'incident_place', 'remarks'])
                ->props('citations', 50, fn (Citation $c) => app(CitationResource::class)($c)),
            'tab' => $tab,
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
