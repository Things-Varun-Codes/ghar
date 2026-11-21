import { ensureSmokeDatabase } from '../lib/smoke-database.mjs';
import { artisan } from './harness.mjs';

/** @param {import('@playwright/test').FullConfig} config */
export default function globalSetup(config) {
    ensureSmokeDatabase(config.webServer?.env ?? {});
    artisan(config, 'migrate:fresh', '--seed', '--force');
}
