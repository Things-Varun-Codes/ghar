/**
 * Fault injection on the load-more cursor request: a transport failure and a 5xx must
 * clear the pending row, show the inline retry and the neutral toast (no Inertia error
 * dialog), and the retry must recover. Inertia's onError never sees these failures, so
 * nothing else catches this class.
 *
 * The toast proves captureSilent ran (it toasts with or without a Sentry DSN), so its
 * literal copy is duplicated here on purpose.
 */

import { expect, test } from './harness.mjs';

const TOAST = 'Something went wrong. Please try again.';
const RETRY_ROW = "Couldn't load more.";
const RETRY_BUTTON = 'Try again';

const SONGS_PAGE = 50;
const songTiles = '#corner-list-panel a[href^="/apps/our-shelf/songs/"]';
const TIMELINE_PAGE = 20;
const momentCards = '.history-timeline-body article.history-event-card';

// Console noise the injected faults cause. Allowed only while a fault is armed:
// Chromium's messages carry no URL to attribute them by.
const FAULT_NOISE = [/net::ERR_/i, /Failed to load resource/i];

const isCursor = (url) => url.searchParams.has('cursor');

/**
 * Routes every cursor request to `handler` until the returned `disarm()`, and drops the
 * console noise logged meanwhile from the run's error list.
 */
async function armFault(page, jsErrors, handler) {
    const from = jsErrors.length;
    const fault = { hits: 0 };

    await page.route(isCursor, (route) => {
        fault.hits += 1;

        return handler(route);
    });

    fault.disarm = async () => {
        await page.unroute(isCursor);

        const during = jsErrors.splice(from);

        jsErrors.push(
            ...during.filter((e) => !FAULT_NOISE.some((re) => re.test(e))),
        );
    };

    return fault;
}

const abort = (route) => route.abort('connectionrefused');

async function expectFailureHandled(page, fault, panel) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // The pending row can clear too fast to see, so the intercepted request proves the
    // sentinel fired.
    await expect
        .poll(() => fault.hits, {
            message:
                'the sentinel never requested the next page: check the fixture has one',
        })
        .toBeGreaterThan(0);
    await expect(
        page.locator(`${panel} [role="status"]`).first(),
        'the pending row clears after the failure',
    ).toBeHidden({ timeout: 10_000 });

    const alert = page.locator(`${panel} [role="alert"]`).first();

    await expect(alert).toBeVisible({ timeout: 8_000 });
    await expect(alert).toContainText(RETRY_ROW);
    await expect(page.getByRole('button', { name: RETRY_BUTTON })).toBeEnabled({
        timeout: 2_000,
    });
    await expect(page.locator('dialog#inertia-error-dialog')).toHaveCount(0);
    await expect(page.getByText(TOAST).first()).toBeVisible();
}

async function expectRecovery(page, panel, items, pageSize) {
    await page.getByRole('button', { name: RETRY_BUTTON }).click();
    await expect(page.locator(items).nth(pageSize)).toBeVisible({
        timeout: 10_000,
    });
    await expect(page.locator(`${panel} [role="alert"]`)).toHaveCount(0);
}

test('Shelf songs: transport failure, server failure, then retry', async ({
    page,
    jsErrors,
}) => {
    test.setTimeout(90_000);
    const panel = '#corner-list-panel';

    await page.goto('/apps/our-shelf/songs', { waitUntil: 'networkidle' });
    await expect(page.locator(songTiles)).toHaveCount(SONGS_PAGE);

    await test.step('transport failure', async () => {
        const fault = await armFault(page, jsErrors, abort);

        await expectFailureHandled(page, fault, panel);
        await fault.disarm();
    });

    await test.step('server failure (5xx)', async () => {
        // Chromium restores the scroll offset across a reload, so the sentinel can fire
        // on mount: arming first means that request fails too.
        const fault = await armFault(page, jsErrors, (route) =>
            route.fulfill({
                status: 500,
                contentType: 'text/html',
                body: '<html><body>500 Internal Server Error (loadmore-smoke fault injection)</body></html>',
            }),
        );

        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.locator(songTiles)).toHaveCount(SONGS_PAGE);
        await expectFailureHandled(page, fault, panel);
        await fault.disarm();
    });

    await test.step('retry recovers', () =>
        expectRecovery(page, panel, songTiles, SONGS_PAGE));
});

test('History timeline: transport failure, then retry', async ({
    page,
    jsErrors,
}) => {
    const panel = '.history-timeline-body';

    await page.goto('/apps/our-history', { waitUntil: 'networkidle' });
    await expect(page.locator(momentCards)).toHaveCount(TIMELINE_PAGE);

    const fault = await armFault(page, jsErrors, abort);

    await expectFailureHandled(page, fault, panel);
    await fault.disarm();
    await expectRecovery(page, panel, momentCards, TIMELINE_PAGE);
});
