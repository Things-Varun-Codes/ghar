import { Head, router, usePage } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { captureSilent } from '@/lib/observability';
import { cn } from '@/lib/utils';
import * as notifications from '@/routes/settings/notifications';
import ErrorState from '@/Shell/Components/ErrorState';
import LoadingState from '@/Shell/Components/LoadingState';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { Auth } from '@/types/auth';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }

    return output;
}

type ToggleState =
    | 'checking'
    | 'worker-unavailable'
    | 'idle-off'
    | 'idle-on'
    | 'requesting-permission'
    | 'subscribing'
    | 'unsubscribing'
    | 'permission-denied'
    | 'error'
    | 'revoked-detected';

type ToggleTone = 'neutral' | 'danger';

// navigator.serviceWorker.ready never settles without a registered worker.
const WORKER_READY_TIMEOUT_MS = 8000;

class WorkerTimeoutError extends Error {}

function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(
            () => reject(new WorkerTimeoutError('Service worker not ready')),
            WORKER_READY_TIMEOUT_MS,
        );

        navigator.serviceWorker.ready
            .then(resolve, reject)
            .finally(() => window.clearTimeout(timer));
    });
}

interface SharedProps {
    vapidPublicKey: string | null; // null when VAPID_PUBLIC_KEY is unset in the environment
    flash?: { error?: string };
    auth: Auth;
    [key: string]: unknown;
}

function resolveUserRole(auth: Auth): 'admin' | 'user' | 'guest' {
    if (!auth.user) {
        return 'guest';
    }

    const first = auth.user.roles?.[0];

    return first === 'admin' || first === 'user' ? first : 'user';
}

interface Props {
    subscriptions: string[];
}

// matchMedia covers Chrome and Firefox; navigator.standalone covers iOS.
function detectStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
            true
    );
}

const SUB_LABELS = {
    checking: { text: 'Checking this device…', tone: 'neutral' },
    'worker-unavailable': {
        text: "This device's notification service didn't start.",
        tone: 'danger',
    },
    'idle-off': {
        text: 'Get a ping when someone adds a moment or writes to you.',
        tone: 'neutral',
    },
    'idle-on': {
        text: 'On for this device.',
        tone: 'neutral',
    },
    'requesting-permission': {
        text: 'Waiting for permission…',
        tone: 'neutral',
    },
    subscribing: {
        text: 'Setting up this device…',
        tone: 'neutral',
    },
    unsubscribing: {
        text: 'Turning off this device…',
        tone: 'neutral',
    },
    'permission-denied': {
        text: 'Your browser blocked notifications. Allow them in your device settings, then try again.',
        tone: 'danger',
    },
    error: {
        text: "Something went wrong. Try again, or check this device's notification settings.",
        tone: 'danger',
    },
    'revoked-detected': {
        text: "Notifications were turned off in this device's settings. Switch on to allow them again.",
        tone: 'danger',
    },
} satisfies Record<ToggleState, { text: string; tone: ToggleTone }>;

export default function NotificationsSettings({ subscriptions }: Props) {
    const {
        vapidPublicKey,
        flash,
        auth,
        name: appName,
    } = usePage<SharedProps>().props;
    const userRole = resolveUserRole(auth);

    const [isStandalone] = useState(detectStandalone);
    const [state, setState] = useState<ToggleState>('checking');

    // ErrorState is the visible failure, so report without captureSilent's toast.
    function showWorkerUnavailable(error: unknown) {
        Sentry.captureException(error, {
            tags: {
                component: 'Settings/Notifications',
                action: 'serviceWorker.ready',
                surface: 'frontend',
            },
        });
        setState('worker-unavailable');
    }

    async function resolveSubscriptionState() {
        if (Notification.permission === 'denied') {
            setState('permission-denied');

            return;
        }

        try {
            const registration = await serviceWorkerReady();
            const sub = await registration.pushManager.getSubscription();

            setState(
                sub && subscriptions.includes(sub.endpoint)
                    ? 'idle-on'
                    : 'idle-off',
            );
            // eslint-disable-next-line local/no-silent-error -- intentional allow-list: a timeout is reported by showWorkerUnavailable; any other SW lookup failure is expected on cold start and has no actionable signal
        } catch (error) {
            if (error instanceof WorkerTimeoutError) {
                showWorkerUnavailable(error);

                return;
            }

            setState('idle-off');
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const revokedDetected =
            params.get('revoked') === '1' || flash?.error === 'revoked';

        if (!isStandalone) {
            return;
        }

        const resolveInitialState = async () => {
            if (revokedDetected) {
                setState('revoked-detected');

                return;
            }

            await resolveSubscriptionState();
        };

        void resolveInitialState();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- resolves once on mount; later changes go through the toggle
    }, []);

    // iOS PWA permission gesture chain — onCheckedChange MUST call
    // Notification.requestPermission() synchronously in the user-gesture stack.
    // NO await before it (async drift breaks the iOS prompt).
    async function onCheckedChange(next: boolean) {
        if (!isStandalone) {
            return;
        } // Fallback Alert is rendered; toggle is hidden.

        if (next) {
            setState('requesting-permission');

            // requestPermission MUST be the first async op — synchronous gesture chain.
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setState(
                    permission === 'denied' ? 'permission-denied' : 'idle-off',
                );

                return;
            }

            setState('subscribing');

            if (!vapidPublicKey) {
                setState('error');

                return;
            }

            try {
                const registration = await serviceWorkerReady();
                const sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
                const json = sub.toJSON();

                router.post(
                    notifications.subscribe.url(),
                    {
                        endpoint: json.endpoint,
                        p256dh: json.keys?.p256dh,
                        auth: json.keys?.auth,
                        content_encoding: 'aesgcm',
                    },
                    {
                        preserveScroll: true,
                        onSuccess: () => setState('idle-on'),
                        onError: (errors) => {
                            captureSilent(
                                new Error('push.subscribe.persist failed'),
                                {
                                    component: 'Settings/Notifications',
                                    action: 'push.subscribe.persist',
                                    surface: 'frontend',
                                    user_role: userRole,
                                    extra: {
                                        payload: errors,
                                        http_status: 422,
                                    },
                                },
                            );
                            setState('error');
                        },
                    },
                );
            } catch (e) {
                if (e instanceof WorkerTimeoutError) {
                    showWorkerUnavailable(e);

                    return;
                }

                captureSilent(e, {
                    component: 'Settings/Notifications',
                    action: 'push.subscribe',
                    surface: 'frontend',
                    user_role: userRole,
                    extra: {
                        payload: {
                            vapidConfigured: Boolean(vapidPublicKey),
                        },
                    },
                });
                setState('error');
            }
        } else {
            setState('unsubscribing');

            try {
                const registration = await serviceWorkerReady();
                const sub = await registration.pushManager.getSubscription();

                if (sub) {
                    router.delete(notifications.unsubscribe.url(), {
                        data: { endpoint: sub.endpoint },
                        preserveScroll: true,
                        onSuccess: async () => {
                            await sub.unsubscribe();
                            setState('idle-off');
                        },
                        onError: (errors) => {
                            captureSilent(
                                new Error('push.unsubscribe.persist failed'),
                                {
                                    component: 'Settings/Notifications',
                                    action: 'push.unsubscribe.persist',
                                    surface: 'frontend',
                                    user_role: userRole,
                                    extra: {
                                        payload: errors,
                                        http_status: 422,
                                    },
                                },
                            );
                            setState('error');
                        },
                    });
                } else {
                    setState('idle-off');
                }
            } catch (e) {
                if (e instanceof WorkerTimeoutError) {
                    showWorkerUnavailable(e);

                    return;
                }

                captureSilent(e, {
                    component: 'Settings/Notifications',
                    action: 'push.unsubscribe',
                    surface: 'frontend',
                    user_role: userRole,
                });
                setState('error');
            }
        }
    }

    const subLabel = SUB_LABELS[state];
    const isDisabled = [
        'requesting-permission',
        'subscribing',
        'unsubscribing',
    ].includes(state);

    return (
        <AppLayout>
            <Head title="Notifications — Settings" />

            <Page tier="prose" title="Notifications" backChevron>
                <div className="os-settings-card rounded-xl p-6">
                    {isStandalone && state === 'checking' ? (
                        <LoadingState rows={1} variant="form" />
                    ) : isStandalone && state === 'worker-unavailable' ? (
                        <ErrorState
                            variant="inline"
                            message={subLabel.text}
                            cause="Close and reopen the app, then try again."
                            onRetry={() => {
                                setState('checking');
                                void resolveSubscriptionState();
                            }}
                        />
                    ) : !isStandalone ? (
                        <Alert
                            data-testid="settings-notifications-non-pwa-alert"
                            className="rounded-none border-0 bg-transparent p-0"
                        >
                            <Info className="h-4 w-4" />
                            <AlertTitle>
                                Install {appName} to enable notifications
                            </AlertTitle>
                            <AlertDescription>
                                Add {appName} to your Home Screen first.
                                Notifications only work from the installed app.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex items-start justify-between gap-4 py-3">
                            <div className="flex-1">
                                <p className="os-settings-row-label">
                                    Push notifications on this device
                                </p>
                                <p
                                    className={cn(
                                        'os-settings-row-status mt-1',
                                        subLabel.tone === 'danger' &&
                                            'os-settings-row-status--danger',
                                    )}
                                    data-testid="settings-notifications-sub-label"
                                >
                                    {subLabel.text}
                                </p>
                            </div>

                            <div className="shrink-0">
                                <Switch
                                    checked={state === 'idle-on'}
                                    disabled={isDisabled}
                                    onCheckedChange={onCheckedChange}
                                    data-testid="settings-notifications-toggle"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Page>
        </AppLayout>
    );
}
