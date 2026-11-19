import { createInertiaApp, router } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import { MotionProvider } from '@/components/motion';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { installOverlayHistory } from '@/hooks/use-overlay-history';
import { watchConnection } from '@/lib/connection';
import { setRegion } from '@/lib/dates';
import { installMotionGate } from '@/lib/motion';
import { installNavigation } from '@/lib/navigation';
import { captureSilent, installUserRole } from '@/lib/observability';
import { installRouteFocus } from '@/lib/route-focus';
import { installAfterWrite } from '@/lib/stale-history';
import AppLayout from '@/Shell/Layouts/AppLayout';

// Server-rendered in app.blade.php, so these come from the runtime environment.
const meta = (name: string): string | undefined =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ||
    undefined;

const appName = meta('application-name') ?? 'Ghar';
const sentryDsn = meta('sentry-dsn');

// offline.html is static and can't ask the server for the install's name.
try {
    if (localStorage.getItem('ghar.appName') !== appName) {
        localStorage.setItem('ghar.appName', appName);
    }
    // eslint-disable-next-line local/no-silent-error -- storage blocked (private mode): the offline page shows its default name.
} catch {
    // Nothing to do.
}

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

// Before createInertiaApp: its popstate listener must run after this one.
installOverlayHistory();
// Before createInertiaApp too, so the first page's navigate is heard.
installUserRole(router);
// Before any page mounts: a list settles in only on a page that is being opened.
installMotionGate(router);

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),

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

    // Every signed-in page shares one AppLayout, so the chrome stays mounted between visits.
    layout: (name) =>
        name.startsWith('Shell/Pages/Auth/') ? undefined : AppLayout,

    setup({ el, App, props }) {
        // Per install, not per page: the first page's region holds for the visit.
        setRegion(props.initialPage.props.region);
        const root = createRoot(el);
        root.render(
            <Sentry.ErrorBoundary
                fallback={({ resetError }) => (
                    <div className="shell-crash-card">
                        <h2 className="mt-0">Something broke.</h2>
                        <p>Sorry about that. Try again, or refresh the page.</p>
                        <button onClick={resetError} className="mt-[1rem]">
                            Try again
                        </button>
                    </div>
                )}
            >
                <MotionProvider>
                    <TooltipProvider>
                        <App {...props} />
                    </TooltipProvider>
                </MotionProvider>
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
        // A CSS colour, so the bar follows --shell-action.
        color: 'var(--shell-action)',
    },
});

installNavigation(router);
installAfterWrite(router);
installRouteFocus();

watchConnection(appName);

// A page's code is its own chunk, fetched only after the server has answered the
// first visit to it. Fetching the everyday pages while the browser is idle takes that
// second round trip out of every first navigation; hashed chunks then stay cached
// until the next release. Admin and sign-in pages are rare enough to load on demand.
function warmPageChunks(): void {
    const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;

    if (connection?.saveData) {
        return;
    }

    for (const [path, importer] of Object.entries(pages)) {
        if (!/\/Pages\/(Admin|Auth)\//.test(path)) {
            // eslint-disable-next-line local/no-silent-error -- best effort: a chunk that fails to warm is fetched again, and reported, when the page is opened.
            importer().catch(() => {});
        }
    }
}

if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(warmPageChunks, { timeout: 5000 });
        } else {
            setTimeout(warmPageChunks, 2000);
        }
    });
}

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
