<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\IssueChallan;
use App\MiniApps\Mailbox\Actions\PayChallan;
use App\MiniApps\Mailbox\Http\Requests\IssueChallanRequest;
use App\MiniApps\Mailbox\Http\Resources\ChallanResource;
use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Services\Household;
use App\Shell\Support\CursorList;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ChallansController
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

        $base = Challan::query()
            ->visibleTo($viewer)
            ->where($sideColumn, $viewer->id)
            ->with(['issuer', 'recipient']);

        $sort = $this->resolveSort($request);
        $this->applyListOrder($base, $sort);
        $q = trim((string) $request->query('q')) ?: null;

        return Inertia::render('MiniApps/Mailbox/Pages/Challans/Index', [
            'challans' => CursorList::make($base)
                ->searchable(['offence', 'penalty', 'incident_place', 'remarks'], $q)
                ->paginate('all', 50, fn (Challan $c) => app(ChallanResource::class)($c)),
            'tab' => $tab,
            'sort' => $sort,
            'q' => $q,
            'members' => $household->optionsFor($viewer),
        ]);
    }

    public function show(Request $request, Challan $challan): Response
    {
        Gate::authorize('view', $challan);

        $challan->load(['issuer', 'recipient']);

        return Inertia::render('MiniApps/Mailbox/Pages/Challans/Show', [
            'challan' => app(ChallanResource::class)($challan),
        ]);
    }

    public function store(IssueChallanRequest $request, IssueChallan $action): RedirectResponse
    {
        $challans = $action($request, $request->user());

        if ($challans->count() === 1) {
            FlashToast::success('Challan issued.');

            return redirect()->route('apps.our-mailbox.challans.show', $challans->first());
        }

        FlashToast::success("{$challans->count()} challans issued.");

        return redirect()->route('apps.our-mailbox.challans.index', ['tab' => 'issued']);
    }

    public function pay(Request $request, Challan $challan, PayChallan $action): RedirectResponse
    {
        Gate::authorize('pay', $challan);

        $action($challan, $request->user());

        FlashToast::success('Challan paid.');

        return redirect()->back();
    }

    public function destroy(Request $request, Challan $challan): RedirectResponse
    {
        Gate::authorize('delete', $challan);

        $challan->delete();

        FlashToast::success('Challan withdrawn.');

        return redirect()
            ->route('apps.our-mailbox.challans.index');
    }
}
