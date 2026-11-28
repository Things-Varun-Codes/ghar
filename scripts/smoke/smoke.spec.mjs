/**
 * Walks every listed route as the admin (or signed out) and fails on a console error,
 * a page error, a non-200 or an empty first h1/h2. `{name}` in a path is filled from
 * the seeded fixtures below. scripts/check-smoke-routes.mjs reads the route paths.
 */

import {
    DEV_ACCOUNTS,
    DEV_INVITE_TOKEN,
    DEV_PASSWORD,
} from '../lib/dev-data.mjs';
import { artisan, expect, test } from './harness.mjs';

const routes = [
    {
        path: '/login',
        auth: false,
        description: '/login (unauthenticated sentinel)',
    },
    {
        path: '/forgot-password',
        auth: false,
        description: '/forgot-password (unauthenticated sentinel)',
    },
    {
        path: '/dashboard',
        auth: true,
        description: '/dashboard (authenticated)',
    },
    { path: '/settings', auth: true, description: '/settings (list)' },
    { path: '/settings/profile', auth: true, description: '/settings/profile' },
    {
        path: '/settings/password',
        auth: true,
        description: '/settings/password',
    },
    {
        path: '/user/confirm-password',
        auth: true,
        chevron: false,
        description:
            '/user/confirm-password (password check before security changes)',
    },
    {
        path: '/settings/security',
        auth: true,
        confirmPassword: true,
        description: '/settings/security (two-step sign-in)',
    },
    {
        // Reached only between the password and the code, so the walk signs in as Leela.
        path: '/two-factor-challenge',
        auth: false,
        signInAs: DEV_ACCOUNTS.leela,
        description: '/two-factor-challenge (the code after the password)',
    },
    { path: '/admin', auth: true, description: '/admin (list)' },
    { path: '/admin/users', auth: true, description: '/admin/users' },
    {
        path: '/admin/rooms',
        auth: true,
        description: '/admin/rooms (rooms the admin chooses)',
    },
    { path: '/admin/invites', auth: true, description: '/admin/invites' },
    {
        path: '/admin/users/{otherUserId}/edit',
        auth: true,
        description: '/admin/users/{id}/edit (admin user edit)',
    },
    {
        path: '/invitations/{inviteToken}',
        auth: false,
        description: '/invitations/{token} (unauthenticated invite accept)',
    },
    {
        path: '/reset-password/{resetToken}?email={resetEmail}',
        auth: false,
        description: '/reset-password/{token}',
    },
    {
        path: '/apps/our-history',
        auth: true,
        description: '/apps/our-history (Our History timeline)',
    },
    {
        // Opens the sheet on the seeded moment with comments and reactions.
        path: '/apps/our-history?moment=5',
        auth: true,
        overlay: true,
        description: '/apps/our-history?moment=5 (Our History moment sheet)',
    },
    {
        path: '/apps/our-history/gallery',
        auth: true,
        description: '/apps/our-history/gallery (Our History gallery)',
    },
    {
        path: '/apps/our-history/calendar',
        auth: true,
        description: '/apps/our-history/calendar (Our History calendar)',
    },
    {
        path: '/apps/our-history/map',
        auth: true,
        description: '/apps/our-history/map (Our History map)',
    },
    {
        path: '/apps/our-history/map?moment=5',
        auth: true,
        overlay: true,
        description:
            '/apps/our-history/map?moment=5 (Our History map, moment sheet)',
    },
    {
        path: '/settings/appearance',
        auth: true,
        description: '/settings/appearance (light, dark or the device)',
    },
    {
        path: '/settings/notifications',
        auth: true,
        description: '/settings/notifications (push opt-in settings)',
    },
    {
        path: '/admin/notifications',
        auth: true,
        description: '/admin/notifications (admin send notification)',
    },
    {
        path: '/admin/shortlinks',
        auth: true,
        description: '/admin/shortlinks (NFC short links admin)',
    },
    {
        path: '/apps/our-shelf',
        auth: true,
        description: '/apps/our-shelf (Our Shelf landing)',
    },
    {
        path: '/apps/our-shelf/{corner.legacy.slug}',
        auth: true,
        description: '/apps/our-shelf/{list} (a list past one page)',
    },
    {
        path: '/apps/our-shelf/{corner.longName.slug}',
        auth: true,
        description: '/apps/our-shelf/{list} (a list with a long name)',
    },
    {
        path: '/apps/our-shelf/{corner.everything.slug}',
        auth: true,
        description: '/apps/our-shelf/{list} (links, pictures and places)',
    },
    {
        path: '/apps/our-shelf/{corner.everything.slug}/{corner.everything.item}',
        auth: true,
        description:
            '/apps/our-shelf/{list}/{item} (a link, a picture and a place)',
    },
    {
        path: '/apps/our-shelf/{corner.place.slug}/{corner.place.item}',
        auth: true,
        description: '/apps/our-shelf/{list}/{item} (a place: a map link)',
    },
    {
        path: '/apps/our-shelf/{corner.nameOnly.slug}/{corner.nameOnly.item}',
        auth: true,
        description: '/apps/our-shelf/{list}/{item} (a name and nothing else)',
    },
    {
        path: '/apps/our-shelf/{corner.legacy.slug}/{corner.legacy.item}',
        auth: true,
        description:
            '/apps/our-shelf/{list}/{item} (an old link, by the id it had before lists)',
    },
    {
        path: '/apps/our-shelf/{cornerEmptyList}',
        auth: true,
        description: '/apps/our-shelf/{list} (an empty list)',
    },
    {
        path: '/apps/our-exchange',
        auth: true,
        description: '/apps/our-exchange (Our Exchange landing)',
    },
    {
        path: '/apps/our-exchange/messages',
        auth: true,
        description: '/apps/our-exchange/messages (Messages)',
    },
    {
        path: '/apps/our-exchange/citations',
        auth: true,
        description: '/apps/our-exchange/citations (Citations index)',
    },
    {
        path: '/apps/our-exchange/citations/{mailboxCitationId}',
        auth: true,
        description:
            '/apps/our-exchange/citations/{citation} (Citation artifact/show)',
    },
    {
        path: '/apps/our-exchange/coupons',
        auth: true,
        description: '/apps/our-exchange/coupons (Coupons index)',
    },
    {
        path: '/apps/our-exchange/coupons/{mailboxCouponId}',
        auth: true,
        description:
            '/apps/our-exchange/coupons/{coupon} (Coupon voucher artifact/show)',
    },
    {
        path: '/apps/our-exchange/postcards',
        auth: true,
        description: '/apps/our-exchange/postcards (Postcards index)',
    },
    {
        path: '/apps/our-exchange/expenses',
        auth: true,
        description: '/apps/our-exchange/expenses (Expenses index)',
    },
    {
        path: '/apps/our-exchange/expenses/groups/{mailboxExpenseGroupId}',
        auth: true,
        description:
            '/apps/our-exchange/expenses/groups/{group} (an expense group)',
    },
    {
        path: '/apps/our-exchange/expenses/balances',
        auth: true,
        description:
            '/apps/our-exchange/expenses/balances (who owes whom, and settling up)',
    },
    {
        path: '/apps/our-exchange/expenses/{mailboxExpenseId}',
        auth: true,
        description: '/apps/our-exchange/expenses/{expense} (one expense)',
    },
    // JSON, no React app: the heading checks don't apply. The scheduler and a worker
    // run first, so the heartbeats it reads are fresh.
    {
        path: '/healthz',
        auth: false,
        json: true,
        description: '/healthz (JSON readiness probe)',
    },
];

// The walk is the admin's, so the citation and coupon must be ones the admin received,
// or `view` would 403. The expense group is General, which everyone is in.
const FIXTURES_PHP = `
use App\\Shell\\Models\\User;
use App\\MiniApps\\Corner\\Models\\CornerList;
use App\\MiniApps\\Corner\\Models\\Item;
use App\\MiniApps\\Mailbox\\Models\\Citation;
use App\\MiniApps\\Mailbox\\Models\\Coupon;
use App\\MiniApps\\Mailbox\\Models\\ExpenseGroup;
use Illuminate\\Support\\Facades\\Password;

$admin = User::where('email', '${DEV_ACCOUNTS.admin}')->firstOrFail();
$kabir = User::where('email', '${DEV_ACCOUNTS.kabir}')->firstOrFail();

echo json_encode([
    'resetToken'        => Password::broker()->createToken($kabir),
    // An item of each sort, as [list slug, item id]: one with a link, a picture and notes
    // together, a place (a map link), a name and nothing else, and an old id that History
    // links still use.
    'corner' => collect([
        'everything' => Item::query()->whereNotNull('url')->whereNotNull('image_url')->whereNotNull('notes'),
        'place' => Item::query()->where('url', 'like', '%/maps/%'),
        'nameOnly' => Item::query()->whereNull('url')->whereNull('image_url')->whereNull('notes'),
    ])->map(fn ($q) => (fn ($i) => ['slug' => $i->list->slug, 'item' => $i->id])($q->with('list')->orderBy('id')->firstOrFail()))
        ->put('legacy', (fn ($i) => ['slug' => $i->list->slug, 'item' => $i->legacy_id])(Item::query()->with('list')->whereNotNull('legacy_id')->orderBy('id')->firstOrFail()))
        ->put('longName', ['slug' => CornerList::query()->orderByRaw('length(name) desc')->value('slug')]),
    'cornerEmptyList'   => CornerList::query()->whereDoesntHave('items')->value('slug'),
    'mailboxCitationId'  => Citation::where('recipient_id', $admin->id)->firstOrFail()->id,
    'mailboxCouponId'   => Coupon::where('recipient_id', $admin->id)->firstOrFail()->id,
    'mailboxExpenseGroupId' => ExpenseGroup::general()->id,
    'mailboxExpenseId' => ExpenseGroup::general()->expenses()->where('is_settlement', false)->orderBy('id')->firstOrFail()->id,
    // A plain member, never the logged-in account, so no self-edit or
    // last-admin guard gets in the way of the edit page.
    'otherUserId'       => $kabir->id,
]);
`;

let fixtures;

test.beforeAll(() => {
    const output = artisan(
        test.info().config,
        'tinker',
        `--execute=${FIXTURES_PHP}`,
    );
    const json = output.split('\n').find((line) => line.startsWith('{'));

    if (!json) {
        throw new Error(`no fixture JSON in tinker output:\n${output}`);
    }

    fixtures = {
        ...JSON.parse(json),
        inviteToken: DEV_INVITE_TOKEN,
        resetEmail: DEV_ACCOUNTS.kabir,
    };
});

function resolve(path) {
    return path.replace(/\{([^}]+)\}/g, (_, key) => {
        const value = key
            .split('.')
            .reduce((object, part) => object?.[part], fixtures);

        if (value === undefined || value === null) {
            throw new Error(`no fixture for {${key}}`);
        }

        return encodeURIComponent(value);
    });
}

const SIGNED_OUT = { cookies: [], origins: [] };

for (const route of routes) {
    test.describe(() => {
        if (!route.auth) {
            test.use({ storageState: SIGNED_OUT });
        }

        test(route.description, async ({ page, request }) => {
            const url = resolve(route.path);

            if (route.json) {
                const config = test.info().config;

                artisan(config, 'schedule:run');
                artisan(config, 'queue:work', '--stop-when-empty', '--tries=1');

                const response = await request.get(url);

                expect(response.status()).toBe(200);
                expect(Object.keys(await response.json())).toEqual(
                    expect.arrayContaining(['status', 'checks']),
                );

                return;
            }

            // An empty map style: the map mounts with nothing to draw and no tile is asked for.
            await page.route('**/api/map/**', (tile) =>
                tile.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
            );

            if (route.signInAs) {
                await page.goto('/login');
                await page.fill('input[name="email"]', route.signInAs);
                await page.fill('input[name="password"]', DEV_PASSWORD);
                await page.click('button[type="submit"]');
                await page.waitForURL((u) => u.pathname !== '/login');
            }

            if (route.confirmPassword) {
                await page.goto('/user/confirm-password');
                await page.fill('input[name="password"]', DEV_PASSWORD);
                await page.click('button[type="submit"]');
                await page.waitForURL(
                    (u) => u.pathname !== '/user/confirm-password',
                );
            }

            const response = await page.goto(url);

            expect(response?.status()).toBe(200);
            await expect(page.locator('h1, h2').first()).toHaveText(/\S/);

            // A modal sheet hides the page under it, chevron included: check the sheet instead.
            if (route.overlay) {
                await expect(page.getByRole('dialog').first()).toBeVisible();
            } else if (route.auth && route.chevron !== false) {
                // One link holds the chevron and the parent's name, so its name starts
                // "Back to …" whether the label shows or sits in aria-label.
                const chevron = page.getByRole('link', { name: /^Back to / });

                if (route.path === '/dashboard') {
                    await expect(chevron).toHaveCount(0);
                } else {
                    await expect(chevron).not.toHaveCount(0);
                }
            }
        });
    });
}
