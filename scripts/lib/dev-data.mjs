/**
 * The sample household the harnesses log in with, seeded by
 * database/seeders/DevDataSeeder.php. tests/Feature/Seeders/DevDataSeederTest.php
 * pins these against the seeder's constants.
 */

export const DEV_PASSWORD = 'ghar-local-dev';

export const DEV_ACCOUNTS = {
    admin: 'admin@example.test',
    ravi: 'ravi@example.test',
    meera: 'meera@example.test',
    kabir: 'kabir@example.test',
};

export const DEV_INVITE_TOKEN = 'dev-invite-token-for-local-testing-only';

export function printDevCredentials(log = console.log) {
    log('');
    log('  Sample household (one shared password: ' + DEV_PASSWORD + ')');
    log('    admin    ' + DEV_ACCOUNTS.admin);
    log('    adult    ' + DEV_ACCOUNTS.ravi);
    log('    adult    ' + DEV_ACCOUNTS.meera);
    log('    younger  ' + DEV_ACCOUNTS.kabir);
    log('');
}
