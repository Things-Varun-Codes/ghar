/*
 * RuleTester fixtures for local/no-inertia-set-data-functional-updater.
 *
 * Run directly: `node tools/eslint-rules/__tests__/no-inertia-set-data-functional-updater.test.js`
 *
 * Rule contract (ERROR level — silent corruption is unsafe):
 *   - `setData(key, fn)` with `fn` an arrow or function expression → report.
 *     Inertia v3 stores the fn as a literal value instead of invoking it; the
 *     UI silently shows the function object stringified.
 *   - `setData(key, value)` (value is not a function) → ok.
 *   - `setData(fn)` single-arg functional form → ok (this is the canonical
 *     Inertia v3 updater form).
 */

import { RuleTester } from 'eslint';

import rule from '../no-inertia-set-data-functional-updater.js';

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
});

ruleTester.run('no-inertia-set-data-functional-updater', rule, {
    valid: [
        // Two-arg with literal value.
        { code: `setData('foo', value);` },
        // Two-arg with spread object literal.
        { code: `setData('foo', { ...prev.foo, key: value });` },
        // Single-arg functional updater (the canonical Inertia v3 form).
        { code: `setData(prev => ({ ...prev, foo: value }));` },
        // Single-arg function expression.
        {
            code: `setData(function (prev) { return { ...prev, foo: value }; });`,
        },
        // Three-arg call (not setData(key, fn)) — out of scope, no report.
        { code: `setData('foo', value, extra);` },
        // setData with literal computed value.
        { code: `setData('foo', currentData.foo + 1);` },
    ],
    invalid: [
        // Two-arg arrow-function — the catalyst pattern.
        {
            code: `setData('foo', () => value);`,
            errors: [{ messageId: 'functionalUpdater' }],
        },
        // Two-arg arrow with prev parameter.
        {
            code: `setData('foo', (prev) => ({ ...prev, key: 1 }));`,
            errors: [{ messageId: 'functionalUpdater' }],
        },
        // Two-arg function expression.
        {
            code: `setData('foo', function () { return value; });`,
            errors: [{ messageId: 'functionalUpdater' }],
        },
    ],
});

console.log('no-inertia-set-data-functional-updater: all fixtures pass');
