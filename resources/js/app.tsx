import { createInertiaApp } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { captureSilent } from '@/lib/observability';

// Server-rendered in app.blade.php, so these come from the runtime environment.
const meta = (name: string): string | undefined =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ||
    undefined;

const appName = meta('application-name') ?? 'Ghar';
const sentryDsn = meta('sentry-dsn');

const pages = import.meta.glob('./**/Pages/**/*.tsx') as Record<
    string,
    () => Promise<{ default: unknown }>
>;

if (import.meta.env.PROD && sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        environment: meta('sentry-environment') ?? 'production',
        release: meta('sentry-release'),
        tracesSampleRate: 0.1,
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
        },
        integrations: [Sentry.browserTracingIntegration()],
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),

    resolve: async (name) => {
        const key = `./${name}.tsx`;
        const importer = pages[key];

        if (!importer) {
            const available = Object.keys(pages).join(', ');

            throw new Error(
                `Page not found: "${name}". ` +
                    `Expected a file at resources/js/${name}.tsx. ` +
                    `Available page paths: ${available}`,
            );
        }

        const module = await importer();

        return module.default as React.ComponentType;
    },

    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <Sentry.ErrorBoundary
                fallback={({ resetError }) => (
                    <div className="shell-crash-card">
                        <h2 className="mt-0">Something broke.</h2>
                        <p>
                            Sorry about that. You can try refreshing the page.
                        </p>
                        <button onClick={resetError} className="mt-[1rem]">
                            Try again
                        </button>
                    </div>
                )}
            >
                <App {...props} />
                <Toaster />
            </Sentry.ErrorBoundary>,
        );

        requestAnimationFrame(() => {
            const el = document.getElementById('app-splash');

            if (!el) {
                return;
            }

            el.classList.add('app-splash--fade');
            const remove = () => el.remove();

            el.addEventListener('transitionend', remove, { once: true });
            setTimeout(remove, 400);
        });
    },

    progress: {
        // Read before any [data-theme] exists, so a literal that works on both themes.
        color: '#3A2A1A',
    },
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
            captureSilent(error, {
                component: 'app/boot',
                action: 'serviceWorker.register',
                surface: 'frontend',
            });
        });
    });
}
