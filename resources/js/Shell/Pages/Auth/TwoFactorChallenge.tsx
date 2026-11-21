import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { login } from '@/routes';
import { store } from '@/routes/two-factor/login';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({ code: '', recovery_code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // A wrong code is expected input and shows on the page, so it is not worth an error
        // report.
        post(store.url(), { onError: () => reset() });
    };

    const toggle = () => {
        setUseRecovery((v) => !v);
        reset();
        clearErrors();
    };

    return (
        <AuthLayout
            title="One more step."
            subtitle={
                useRecovery
                    ? 'Enter one of the recovery codes you saved.'
                    : 'Enter the 6-digit code from your authenticator app.'
            }
        >
            <Head title="Two-step sign-in" />

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                {useRecovery ? (
                    <FormField
                        label="Recovery code"
                        name="recovery_code"
                        error={errors.recovery_code}
                    >
                        <Input
                            id="recovery_code"
                            name="recovery_code"
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={data.recovery_code}
                            onChange={(e) =>
                                setData('recovery_code', e.target.value)
                            }
                            className="shell-auth-field"
                            autoFocus
                            required
                        />
                    </FormField>
                ) : (
                    <FormField label="Code" name="code" error={errors.code}>
                        <Input
                            id="code"
                            name="code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            className="shell-auth-field"
                            autoFocus
                            required
                        />
                    </FormField>
                )}

                <SubmitButton
                    processing={processing}
                    busyText="Checking…"
                    className="shell-auth-submit shell-press w-full font-medium"
                >
                    Sign in
                </SubmitButton>

                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={toggle}
                        className="shell-focus inline-flex min-h-[44px] items-center rounded-full px-1 text-[14px] text-(--muted-foreground) hover:text-(--foreground)"
                    >
                        {useRecovery
                            ? 'Use a code from your app'
                            : 'Lost your phone? Use a recovery code'}
                    </button>
                    <a
                        href={login.url()}
                        className="inline-flex min-h-[44px] items-center justify-center py-2.5 text-[14px] text-(--muted-foreground)"
                    >
                        Back to sign in
                    </a>
                </div>
            </form>
        </AuthLayout>
    );
}
