/*
 * Requires a catch block, an Inertia onError or a Promise .catch handler to report
 * through Sentry.captureException, Sentry.captureMessage or captureSilent. Suppress
 * with `// eslint-disable-next-line local/no-silent-error -- <rationale>`.
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'Forbid silent catch / Inertia onError without a Sentry capture call',
        },
        schema: [],
        messages: {
            silentCatch:
                'catch block must call Sentry.captureException, Sentry.captureMessage, or captureSilent(...). Disable with `// eslint-disable-next-line local/no-silent-error -- <rationale>` when the silence is intentional.',
            silentOnError:
                'Inertia onError callback must call Sentry.captureException, Sentry.captureMessage, or captureSilent(...). Disable with `// eslint-disable-next-line local/no-silent-error -- <rationale>` when the silence is intentional.',
            silentPromiseCatch:
                'Promise .catch() handler must call Sentry.captureException, Sentry.captureMessage, or captureSilent(...) — an empty body silently discards the rejection. Disable with `// eslint-disable-next-line local/no-silent-error -- <rationale>` when the silence is intentional.',
        },
    },
    create(context) {
        const SENTRY_CALL_RE =
            /Sentry\s*\.\s*captureException|Sentry\s*\.\s*captureMessage|captureSilent\s*\(/;

        const sourceCode = context.sourceCode;

        const nodeHasSentryCall = (node) => {
            if (!node) {
                return false;
            }

            const text = sourceCode.getText(node);

            return SENTRY_CALL_RE.test(text);
        };

        const inertiaRouterMethods = new Set([
            'post',
            'patch',
            'delete',
            'put',
            'get',
        ]);

        return {
            CatchClause(node) {
                if (!nodeHasSentryCall(node.body)) {
                    context.report({
                        node,
                        messageId: 'silentCatch',
                    });
                }
            },
            // One CallExpression key: a duplicate would silently overwrite the first.
            CallExpression(node) {
                const callee = node.callee;

                if (
                    callee.type === 'MemberExpression' &&
                    callee.property.type === 'Identifier' &&
                    callee.property.name === 'catch' &&
                    node.arguments.length === 1
                ) {
                    const handler = node.arguments[0];
                    const isFunctionHandler =
                        handler.type === 'ArrowFunctionExpression' ||
                        handler.type === 'FunctionExpression';

                    if (
                        isFunctionHandler &&
                        handler.body.type === 'BlockStatement' &&
                        handler.body.body.length === 0
                    ) {
                        context.report({
                            node,
                            messageId: 'silentPromiseCatch',
                        });
                    }

                    return;
                }

                if (
                    callee.type !== 'MemberExpression' ||
                    callee.object.type !== 'Identifier' ||
                    callee.object.name !== 'router' ||
                    callee.property.type !== 'Identifier' ||
                    !inertiaRouterMethods.has(callee.property.name)
                ) {
                    return;
                }

                const objArgs = node.arguments.filter(
                    (a) => a.type === 'ObjectExpression',
                );
                const opts = objArgs[objArgs.length - 1];

                if (!opts) {
                    return;
                }

                const onError = opts.properties.find(
                    (p) =>
                        p.type === 'Property' &&
                        p.key &&
                        ((p.key.type === 'Identifier' &&
                            p.key.name === 'onError') ||
                            (p.key.type === 'Literal' &&
                                p.key.value === 'onError')),
                );

                if (!onError) {
                    return;
                }

                if (!nodeHasSentryCall(onError.value)) {
                    context.report({
                        node: onError,
                        messageId: 'silentOnError',
                    });
                }
            },
        };
    },
};
