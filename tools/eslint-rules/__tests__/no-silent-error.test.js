/*
 * RuleTester fixtures for local/no-silent-error.
 *
 * Run directly: `node tools/eslint-rules/__tests__/no-silent-error.test.js`
 * RuleTester.run throws synchronously on a fixture failure, so a clean exit
 * 0 == green.
 *
 * Rule contract:
 *   - `catch` block with no Sentry.captureException / Sentry.captureMessage /
 *     captureSilent(...) call → report.
 *   - `router.{post,patch,delete,put}` Inertia options object with an
 *     onError callback that has no Sentry call → report.
 *   - `captureSilent(error, ctx)` is recognized as a Sentry call (it wraps
 *     Sentry.captureException internally).
 */

import { RuleTester } from 'eslint';

import rule from '../no-silent-error.js';

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
});

ruleTester.run('no-silent-error', rule, {
    valid: [
        // Bare catch calling Sentry.captureException directly.
        {
            code: `try { doThing(); } catch (e) { Sentry.captureException(e); }`,
        },
        // Bare catch calling captureSilent.
        {
            code: `try { doThing(); } catch (e) { captureSilent(e, { component: 'x', action: 'a', surface: 'frontend' }); }`,
        },
        // Inertia router.post with onError calling captureSilent.
        {
            code: `router.post('/x', {}, { onError: (errors) => captureSilent(errors, { component: 'x', action: 'a', surface: 'frontend' }) });`,
        },
        // Inertia router.patch with onError calling Sentry.captureException.
        {
            code: `router.patch('/x', {}, { onError: (e) => { Sentry.captureException(e); } });`,
        },
        // Inertia router.delete with onError calling Sentry.captureMessage.
        {
            code: `router.delete('/x', { onError: (e) => Sentry.captureMessage('bad') });`,
        },
    ],
    invalid: [
        // Bare empty catch — the canonical silent path.
        {
            code: `try { doThing(); } catch (e) {}`,
            errors: [{ messageId: 'silentCatch' }],
        },
        // Catch that only sets state, no Sentry.
        {
            code: `try { doThing(); } catch (e) { setState('error'); }`,
            errors: [{ messageId: 'silentCatch' }],
        },
        // Inertia router.post onError that only sets state.
        {
            code: `router.post('/x', {}, { onError: (errors) => setState('error') });`,
            errors: [{ messageId: 'silentOnError' }],
        },
        // Inertia router.patch onError block body without Sentry call.
        {
            code: `router.patch('/x', {}, { onError: (errors) => { setState('error'); } });`,
            errors: [{ messageId: 'silentOnError' }],
        },
    ],
});

console.log('no-silent-error: all fixtures pass');
