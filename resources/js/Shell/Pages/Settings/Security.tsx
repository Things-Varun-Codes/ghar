import { router, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formSubmitOptions, mutationOptions } from '@/lib/mutation';
import * as twoFactor from '@/routes/two-factor';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface Props {
    enabled: boolean;
    pending: boolean;
    qrSvg: string | null;
    setupKey: string | null;
    recoveryCodes?: string[] | null;
}

const COMPONENT = 'Settings/Security';

function useMutation(action: string) {
    const [busy, setBusy] = useState(false);

    return {
        busy,
        options: {
            preserveScroll: true,
            ...mutationOptions({
                component: COMPONENT,
                action,
                onPendingChange: setBusy,
            }),
        },
    };
}

function Confirm({ qrSvg, setupKey }: { qrSvg: string; setupKey: string }) {
    const form = useForm({ code: '' });
    const cancel = useMutation('two-factor.cancel');

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(twoFactor.confirm.url(), {
            preserveScroll: true,
            // Fortify validates this into its own error bag.
            errorBag: 'confirmTwoFactorAuthentication',
            ...formSubmitOptions({
                component: COMPONENT,
                action: 'two-factor.confirm',
                isShownField: (key) => key === 'code',
            }),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <p className="os-settings-notice">
                Scan this with an authenticator app, such as Google
                Authenticator, 1Password or Aegis. Then enter the code it shows.
            </p>
            <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
                alt="QR code for your authenticator app"
                width={192}
                height={192}
                className="rounded-md bg-white p-2"
            />
            <p className="os-settings-row-status">
                Can&apos;t scan it? Type this key instead:{' '}
                <code className="font-mono break-all text-(--foreground) select-all">
                    {setupKey}
                </code>
            </p>
            <FormField label="Code" name="code" error={form.errors.code}>
                <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={form.data.code}
                    onChange={(e) => form.setData('code', e.target.value)}
                    className="os-settings-input"
                    required
                />
            </FormField>
            <div className="flex flex-wrap gap-3 pt-2">
                <SubmitButton
                    processing={form.processing}
                    busyText="Checking…"
                    className="os-settings-submit shell-press px-5"
                >
                    Turn on
                </SubmitButton>
                <Button
                    type="button"
                    variant="outline"
                    disabled={cancel.busy}
                    onClick={() =>
                        router.delete(twoFactor.disable.url(), cancel.options)
                    }
                    className="min-h-[44px] px-5"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function RecoveryCodes({ codes }: { codes?: string[] | null }) {
    const [showing, setShowing] = useState(false);
    const regenerate = useMutation('two-factor.regenerate');

    if (!codes) {
        return (
            <Button
                type="button"
                variant="outline"
                disabled={showing}
                onClick={() =>
                    router.reload({
                        only: ['recoveryCodes'],
                        onStart: () => setShowing(true),
                        onFinish: () => setShowing(false),
                    })
                }
                className="min-h-[44px] px-5"
            >
                Show recovery codes
            </Button>
        );
    }

    return (
        <div className="space-y-3">
            <p className="os-settings-notice">
                Keep these somewhere safe, away from your phone. Each one signs
                you in once if you lose your phone.
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-(--border) p-4 font-mono text-[14px] select-all">
                {codes.map((code) => (
                    <li key={code}>{code}</li>
                ))}
            </ul>
            <Button
                type="button"
                variant="outline"
                disabled={regenerate.busy}
                onClick={() =>
                    router.post(
                        twoFactor.regenerateRecoveryCodes.url(),
                        {},
                        regenerate.options,
                    )
                }
                className="min-h-[44px] px-5"
            >
                Make new codes
            </Button>
        </div>
    );
}

export default function Security({
    enabled,
    pending,
    qrSvg,
    setupKey,
    recoveryCodes,
}: Props) {
    const enable = useMutation('two-factor.enable');
    const disable = useMutation('two-factor.disable');
    const [confirmOff, setConfirmOff] = useState(false);

    return (
        <Page tier="prose" title="Two-step sign-in" room="Settings" backChevron>
            <div className="os-settings-card space-y-5 p-6">
                {enabled ? (
                    <>
                        <p className="os-settings-notice">
                            On. Signing in asks for a code from your
                            authenticator app as well as your password.
                        </p>
                        <RecoveryCodes codes={recoveryCodes} />
                        <div className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={disable.busy}
                                onClick={() => setConfirmOff(true)}
                                className="os-admin-outline-destructive min-h-[44px] px-5"
                            >
                                Turn off
                            </Button>
                        </div>
                    </>
                ) : pending && qrSvg && setupKey ? (
                    <Confirm qrSvg={qrSvg} setupKey={setupKey} />
                ) : (
                    <>
                        <p className="os-settings-notice">
                            Off. Turn it on and signing in will also ask for a
                            code from an app on your phone, so a stolen password
                            isn&apos;t enough.
                        </p>
                        <Button
                            type="button"
                            disabled={enable.busy}
                            onClick={() =>
                                router.post(
                                    twoFactor.enable.url(),
                                    {},
                                    enable.options,
                                )
                            }
                            className="os-settings-submit shell-press px-5"
                        >
                            Set it up
                        </Button>
                    </>
                )}
            </div>

            <ConfirmDialog
                open={confirmOff}
                onOpenChange={setConfirmOff}
                title="Turn off two-step sign-in?"
                description="Signing in will ask for your password alone. Your recovery codes stop working."
                confirmLabel="Turn off"
                variant="destructive"
                onConfirm={() =>
                    router.delete(twoFactor.disable.url(), disable.options)
                }
            />
        </Page>
    );
}
