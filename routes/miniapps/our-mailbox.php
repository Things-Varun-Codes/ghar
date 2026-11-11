<?php

use App\MiniApps\Mailbox\Controllers\BouquetsController;
use App\MiniApps\Mailbox\Controllers\ChallansController;
use App\MiniApps\Mailbox\Controllers\CouponsController;
use App\MiniApps\Mailbox\Controllers\MailboxController;
use App\MiniApps\Mailbox\Controllers\MessagesController;
use Illuminate\Support\Facades\Route;

Route::prefix('apps/our-mailbox')->name('apps.our-mailbox.')->group(function () {
    Route::post('/bouquets/generate', [BouquetsController::class, 'generate'])
        ->middleware('throttle:bouquet-generate')
        ->name('bouquets.generate');

    Route::get('/', [MailboxController::class, 'index'])->name('landing');
    Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');

    Route::get('/flowers', [BouquetsController::class, 'index'])->name('flowers.index');

    Route::get('/challans', [ChallansController::class, 'index'])->name('challans.index');
    Route::get('/challans/{challan}', [ChallansController::class, 'show'])->name('challans.show');

    Route::get('/coupons', [CouponsController::class, 'index'])->name('coupons.index');
    Route::get('/coupons/{coupon}', [CouponsController::class, 'show'])->name('coupons.show');

    Route::middleware('throttle:corner-mutations')->group(function () {
        Route::post('/bouquets', [BouquetsController::class, 'store'])->name('bouquets.store');

        Route::post('/messages', [MessagesController::class, 'store'])->name('messages.store');
        Route::delete('/messages/{message}', [MessagesController::class, 'destroy'])->name('messages.destroy');

        Route::delete('/flowers/{bouquet}', [BouquetsController::class, 'destroy'])->name('flowers.destroy');

        Route::post('/challans', [ChallansController::class, 'store'])->name('challans.store');
        Route::patch('/challans/{challan}/pay', [ChallansController::class, 'pay'])
            ->can('pay', 'challan')->name('challans.pay');
        Route::delete('/challans/{challan}', [ChallansController::class, 'destroy'])
            ->can('delete', 'challan')->name('challans.destroy');

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
