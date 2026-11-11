<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CancelRequest;
use App\MiniApps\Mailbox\Actions\FulfillCoupon;
use App\MiniApps\Mailbox\Actions\IssueCoupon;
use App\MiniApps\Mailbox\Actions\RequestCoupon;
use App\MiniApps\Mailbox\Http\Requests\IssueCouponRequest;
use App\MiniApps\Mailbox\Http\Resources\CouponResource;
use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Services\Household;
use App\Shell\Support\CursorList;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CouponsController
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

        $base = Coupon::query()
            ->visibleTo($viewer)
            ->where($sideColumn, $viewer->id)
            ->with(['issuer', 'recipient']);

        $sort = $this->resolveSort($request);
        $this->applyListOrder($base, $sort);
        $q = trim((string) $request->query('q')) ?: null;

        return Inertia::render('MiniApps/Mailbox/Pages/Coupons/Index', [
            'coupons' => CursorList::make($base)
                ->searchable(['title', 'description'], $q)
                ->paginate('all', 50, fn (Coupon $c) => app(CouponResource::class)($c)),
            'tab' => $tab,
            'sort' => $sort,
            'q' => $q,
            'members' => $household->optionsFor($viewer),
        ]);
    }

    public function show(Request $request, Coupon $coupon): Response
    {
        Gate::authorize('view', $coupon);

        $coupon->load(['issuer', 'recipient']);

        return Inertia::render('MiniApps/Mailbox/Pages/Coupons/Show', [
            'coupon' => app(CouponResource::class)($coupon),
        ]);
    }

    public function store(IssueCouponRequest $request, IssueCoupon $action): RedirectResponse
    {
        $coupons = $action($request, $request->user());

        if ($coupons->count() === 1) {
            FlashToast::success('Coupon sent.');

            return redirect()->route('apps.our-mailbox.coupons.show', $coupons->first());
        }

        FlashToast::success("{$coupons->count()} coupons sent.");

        return redirect()->route('apps.our-mailbox.coupons.index', ['tab' => 'issued']);
    }

    public function request(Request $request, Coupon $coupon, RequestCoupon $action): RedirectResponse
    {
        Gate::authorize('request', $coupon);

        $action($coupon, $request->user());

        FlashToast::success('Coupon requested.');

        return redirect()->back();
    }

    public function cancel(Request $request, Coupon $coupon, CancelRequest $action): RedirectResponse
    {
        Gate::authorize('cancel', $coupon);

        $action($coupon, $request->user());

        FlashToast::success('Request cancelled.');

        return redirect()->back();
    }

    public function fulfill(Request $request, Coupon $coupon, FulfillCoupon $action): RedirectResponse
    {
        Gate::authorize('fulfill', $coupon);

        $action($coupon, $request->user());

        FlashToast::success('Coupon fulfilled.');

        return redirect()->back();
    }

    public function destroy(Request $request, Coupon $coupon): RedirectResponse
    {
        Gate::authorize('delete', $coupon);

        $coupon->delete();

        FlashToast::success('Coupon withdrawn.');

        return redirect()
            ->route('apps.our-mailbox.coupons.index');
    }
}
