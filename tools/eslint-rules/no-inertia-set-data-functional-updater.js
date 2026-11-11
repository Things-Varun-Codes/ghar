/*
 * ESLint rule: local/no-inertia-set-data-functional-updater
 *
 * Severity: ERROR (silent corruption is unsafe; ship as error from
 * day 1 unlike no-silent-error which is WARN-first).
 *
 * Context: Inertia v3 useForm's `setData(key, value)` stores the second
 * argument as a LITERAL value. Passing a function as the second argument does
 * NOT call the function — it stores the function reference instead. The UI
 * silently shows the function stringified or a runtime crash downstream when
 * the form serializer tries to wire a function into a form payload. This is
 * a regression class that has bitten this codebase before.
 *
 * Canonical fixes the rule message suggests:
 *  - Two-arg with a computed value: `setData('foo', computedValue)`
 *  - Two-arg with an object spread: `setData('foo', { ...currentData.foo, key: ... })`
 *  - Single-arg functional updater: `setData(prev => ({ ...prev, foo: ... }))`
 *
 * The rule deliberately does NOT auto-fix — semantics differ subtly between
 * the spread and the functional updater forms, and the right rewrite is
 * call-site dependent.
 */

const FUNCTION_TYPES = new Set([
    'ArrowFunctionExpression',
    'FunctionExpression',
]);

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Forbid setData(key, fn) — Inertia v3 stores fn as a literal value, not an updater',
        },
        schema: [],
        messages: {
            functionalUpdater:
                'setData(key, fn) is not supported in Inertia v3 — the function is stored as a literal value, not called. Use setData(key, computedValue), setData(key, { ...currentData.foo, ... }), or the single-arg functional form setData(prev => ({ ...prev, foo: ... })).',
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (
                    node.callee.type !== 'Identifier' ||
                    node.callee.name !== 'setData'
                ) {
                    return;
                }

                if (node.arguments.length !== 2) {
                    return;
                }

                const second = node.arguments[1];

                if (!FUNCTION_TYPES.has(second.type)) {
                    return;
                }

                context.report({
                    node,
                    messageId: 'functionalUpdater',
                });
            },
        };
    },
};
