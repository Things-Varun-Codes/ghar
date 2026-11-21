import path from 'node:path';

import { expect, test } from '@playwright/test';

import { DEV_ACCOUNTS, DEV_PASSWORD } from '../lib/dev-data.mjs';

test('sign in as the admin', async ({ page }) => {
    const response = await page.goto('/login');

    expect(response?.status()).toBe(200);
    await page.fill('input[name="email"]', DEV_ACCOUNTS.admin);
    await page.fill('input[name="password"]', DEV_PASSWORD);
    await page.click('button[type="submit"]');
    // Login is an XHR, not a document load: wait for the redirect, or the cookie isn't set yet.
    await page.waitForURL((url) => url.pathname !== '/login');
    await page.context().storageState({
        path: path.join(test.info().project.outputDir, 'admin.json'),
    });
});
