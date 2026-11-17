<?php

use App\MiniApps\Mailbox\Controllers\BouquetsController;
use App\MiniApps\Mailbox\Controllers\CitationsController;
use App\MiniApps\Mailbox\Controllers\CouponsController;
use App\MiniApps\Mailbox\Controllers\MailboxController;
use App\MiniApps\Mailbox\Controllers\MessagesController;
use App\MiniApps\Mailbox\Support\EntryTypes;
use Illuminate\Support\Facades\Route;

/** Every route of an entry type sits in its group, so turning the type off takes all of them. */
$type = fn (string $type): string => 'room:'.EntryTypes::ROOM.','.$type;

Route::prefix('apps/our-mailbox')->name('apps.our-mailbox.')->group(function () use ($type) {
    Route::get('/', [MailboxController::class, 'index'])->name('landing');

    Route::middleware($type(EntryTypes::MESSAGES))->group(function () {
        Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');

        Route::middleware('throttle:corner-mutations')->group(function () {
            Route::post('/messages', [MessagesController::class, 'store'])->name('messages.store');
            Route::delete('/messages/{message}', [MessagesController::class, 'destroy'])->name('messages.destroy');
        });
    });

    Route::middleware($type(EntryTypes::FLOWERS))->group(function () {
        Route::post('/bouquets/generate', [BouquetsController::class, 'generate'])
            ->middleware('throttle:bouquet-generate')
            ->name('bouquets.generate');

        Route::get('/flowers', [BouquetsController::class, 'index'])->name('flowers.index');

        Route::middleware('throttle:corner-mutations')->group(function () {
            Route::post('/bouquets', [BouquetsController::class, 'store'])->name('bouquets.store');
            Route::delete('/flowers/{bouquet}', [BouquetsController::class, 'destroy'])->name('flowers.destroy');
        });
    });

    Route::middleware($type(EntryTypes::CITATIONS))->group(function () {
        Route::get('/citations', [CitationsController::class, 'index'])->name('citations.index');
        Route::get('/citations/{citation}', [CitationsController::class, 'show'])->name('citations.show');

        Route::middleware('throttle:corner-mutations')->group(function () {
            Route::post('/citations', [CitationsController::class, 'store'])->name('citations.store');
            Route::patch('/citations/{citation}/pay', [CitationsController::class, 'pay'])
                ->can('pay', 'citation')->name('citations.pay');
            Route::delete('/citations/{citation}', [CitationsController::class, 'destroy'])
                ->can('delete', 'citation')->name('citations.destroy');
        });
    });

    // Citations were called challans. Notifications already delivered and bookmarks still hold
    // these addresses.
    Route::get('/challans/{id?}', fn (?string $id = null) => redirect()->route(
        $id === null ? 'apps.our-mailbox.citations.index' : 'apps.our-mailbox.citations.show',
        $id === null ? [] : ['citation' => $id],
        301,
    ))->whereNumber('id')->name('challans.redirect');

    Route::middleware($type(EntryTypes::COUPONS))->group(function () {
        Route::get('/coupons', [CouponsController::class, 'index'])->name('coupons.index');
        Route::get('/coupons/{coupon}', [CouponsController::class, 'show'])->name('coupons.show');

        Route::middleware('throttle:corner-mutations')->group(function () {
            Route::post('/coupons', [CouponsController::class, 'store'])->name('coupons.store');
            Route::patch('/coupons/{coupon}/request', [CouponsController::class, 'request'])
                ->can('request', 'coupon')->name('coupons.request');
            Route::patch('/coupons/{coupon}/cancel', [CouponsController::class, 'cancel'])
                ->can('cancel', 'coupon')->name('coupons.cancel');
            Route::patch('/coupons/{coupon}/fulfill', [CouponsController::class, 'fulfill'])
                ->can('fulfill', 'coupon')->name('coupons.fulfill');
            Route::delete('/coupons/{coupon}', [CouponsController::class, 'destroy'])
                ->can('delete', 'coupon')->name('coupons.destroy');
        });
    });
});
