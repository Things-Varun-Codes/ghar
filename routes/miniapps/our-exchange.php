<?php

use App\MiniApps\Mailbox\Controllers\CitationsController;
use App\MiniApps\Mailbox\Controllers\CouponsController;
use App\MiniApps\Mailbox\Controllers\ExpenseGroupsController;
use App\MiniApps\Mailbox\Controllers\ExpensesController;
use App\MiniApps\Mailbox\Controllers\MailboxController;
use App\MiniApps\Mailbox\Controllers\MessagesController;
use App\MiniApps\Mailbox\Controllers\PostcardsController;
use App\MiniApps\Mailbox\Controllers\SavedPromptsController;
use App\MiniApps\Mailbox\Support\EntryTypes;
use Illuminate\Support\Facades\Route;

/** Every route of an entry type sits in its group, so turning the type off takes all of them. */
$type = fn (string $type): string => 'room:'.EntryTypes::ROOM.','.$type;

Route::prefix('apps/our-exchange')->name('apps.our-exchange.')->group(function () use ($type) {
    Route::get('/', [MailboxController::class, 'index'])->name('landing');

    Route::middleware($type(EntryTypes::MESSAGES))->group(function () {
        Route::get('/messages', [MessagesController::class, 'index'])->name('messages.index');

        Route::middleware('throttle:mailbox-mutations')->group(function () {
            Route::post('/messages', [MessagesController::class, 'store'])->name('messages.store');
            Route::delete('/messages/{message}', [MessagesController::class, 'destroy'])->name('messages.destroy');
        });
    });

    Route::middleware($type(EntryTypes::POSTCARDS))->group(function () {
        Route::post('/postcards/generate', [PostcardsController::class, 'generate'])
            ->middleware('throttle:postcard-generate')
            ->name('postcards.generate');

        Route::get('/postcards', [PostcardsController::class, 'index'])->name('postcards.index');
        // Pushes and bookmarks from when postcards were flowers.
        Route::get('/flowers', [PostcardsController::class, 'fromFlowers']);

        Route::middleware('throttle:mailbox-mutations')->group(function () {
            Route::post('/postcards', [PostcardsController::class, 'store'])->name('postcards.store');
            Route::delete('/postcards/{postcard}', [PostcardsController::class, 'destroy'])->name('postcards.destroy');
            Route::post('/postcards/prompts', [SavedPromptsController::class, 'store'])->name('postcards.prompts.store');
            Route::delete('/postcards/prompts/{prompt}', [SavedPromptsController::class, 'destroy'])
                ->whereNumber('prompt')
                ->name('postcards.prompts.destroy');
        });
    });

    Route::middleware($type(EntryTypes::CITATIONS))->group(function () {
        Route::get('/citations', [CitationsController::class, 'index'])->name('citations.index');
        Route::get('/citations/{citation}', [CitationsController::class, 'show'])->name('citations.show');

        Route::middleware('throttle:mailbox-mutations')->group(function () {
            Route::post('/citations', [CitationsController::class, 'store'])->name('citations.store');
            Route::patch('/citations/{citation}/pay', [CitationsController::class, 'pay'])->name('citations.pay');
            Route::delete('/citations/{citation}', [CitationsController::class, 'destroy'])->name('citations.destroy');
        });
    });

    Route::middleware($type(EntryTypes::COUPONS))->group(function () {
        Route::get('/coupons', [CouponsController::class, 'index'])->name('coupons.index');
        Route::get('/coupons/{coupon}', [CouponsController::class, 'show'])->name('coupons.show');

        Route::middleware('throttle:mailbox-mutations')->group(function () {
            Route::post('/coupons', [CouponsController::class, 'store'])->name('coupons.store');
            Route::patch('/coupons/{coupon}/request', [CouponsController::class, 'request'])->name('coupons.request');
            Route::patch('/coupons/{coupon}/cancel', [CouponsController::class, 'cancel'])->name('coupons.cancel');
            Route::patch('/coupons/{coupon}/fulfill', [CouponsController::class, 'fulfill'])->name('coupons.fulfill');
            Route::delete('/coupons/{coupon}', [CouponsController::class, 'destroy'])->name('coupons.destroy');
        });
    });

    Route::middleware($type(EntryTypes::EXPENSES))->prefix('expenses')->name('expenses.')->group(function () {
        Route::get('/', [ExpensesController::class, 'index'])->name('index');
        Route::get('/groups/{group}', [ExpensesController::class, 'show'])->name('groups.show');

        Route::middleware('throttle:mailbox-mutations')->group(function () {
            Route::post('/groups', [ExpenseGroupsController::class, 'store'])->name('groups.store');
            Route::put('/groups/order', [ExpenseGroupsController::class, 'order'])->name('groups.order');
            Route::patch('/groups/{group}', [ExpenseGroupsController::class, 'update'])->name('groups.update');
            Route::patch('/groups/{group}/archive', [ExpenseGroupsController::class, 'archive'])->name('groups.archive');
            Route::patch('/groups/{group}/unarchive', [ExpenseGroupsController::class, 'unarchive'])->name('groups.unarchive');
            Route::delete('/groups/{group}', [ExpenseGroupsController::class, 'destroy'])->name('groups.destroy');

            Route::post('/groups/{group}/expenses', [ExpensesController::class, 'store'])->name('store');
            Route::post('/groups/{group}/settlements', [ExpensesController::class, 'settle'])->name('settlements.store');
            Route::post('/settle/{user}', [ExpensesController::class, 'settleWith'])->name('settle');

            Route::patch('/{expense}', [ExpensesController::class, 'update'])->whereNumber('expense')->name('update');
            Route::delete('/{expense}', [ExpensesController::class, 'destroy'])->whereNumber('expense')->name('destroy');
            Route::patch('/{expense}/restore', [ExpensesController::class, 'restore'])->whereNumber('expense')->withTrashed()->name('restore');
        });
    });
});
