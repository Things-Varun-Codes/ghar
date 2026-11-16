import { Head, Link, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { FormEventHandler } from 'react';
import PasswordInput from '@/components/password-input';
import { store } from '@/routes/login';
import * as password from '@/routes/password';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

export default function Login({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    const [showInvalid, setShowInvalid] = useState(false);
    const emailInput = useRef<HTMLInputElement>(null);

    const throttleMessage = (errors as Record<string, string>).throttle;
    const isThrottled = Boolean(throttleMessage);
    const showInvalidNow = showInvalid && !isThrottled && Boolean(errors.email);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setShowInvalid(true);
        post(store.url(), {
            // Bad credentials are expected input and show on the page, so they are not worth an
            // error report.
            onError: () => {
                setShowInvalid(true);
                emailInput.current?.focus();
            },
        });
    };

    const clearInvalid = () => {
        if (showInvalid) {
            setShowInvalid(false);
        }
    };

    return (
        <AuthLayout title="Welcome back.">
            <Head title="Sign in" />

            {status && (
                <p className="mt-3 text-[14px] text-(--muted-foreground)">
                    {status}
                </p>
            )}

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <FormField label="Email" name="email">
                    <input
                        ref={emailInput}
                        id="email"
                        name="email"
                        aria-invalid={showInvalidNow || undefined}
                        aria-describedby={
                            showInvalidNow ? 'login-error' : undefined
                        }
                        type="email"
                        autoComplete="username"
                        value={data.email}
                        onChange={(e) => {
                            setData('email', e.target.value);
                            clearInvalid();
                        }}
                        disabled={isThrottled}
                        className="shell-auth-email shell-field block w-full border px-3 py-2.5 outline-none"
                        placeholder="you@example.com"
                        required
                    />
                </FormField>

                <FormField label="Password" name="password">
                    <PasswordInput
                        id="password"
                        name="password"
                        aria-invalid={showInvalidNow || undefined}
                        aria-describedby={
                            showInvalidNow ? 'login-error' : undefined
                        }
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => {
                            setData('password', e.target.value);
                            clearInvalid();
                        }}
                        disabled={isThrottled}
                        className="shell-auth-password shell-field block w-full border px-3 py-2.5 outline-none"
                        required
                    />
                </FormField>
                <div className="-mt-2 flex justify-end">
                    <Link
                        href={password.request.url()}
                        className="shell-focus inline-flex min-h-[44px] items-center rounded-full px-1 text-[14px] text-(--muted-foreground) hover:text-(--foreground)"
                    >
                        Forgot password?
                    </Link>
                </div>

                <label className="flex min-h-[44px] items-center gap-2 pt-1 text-[16px]">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        disabled={isThrottled}
                        className="h-[18px] w-[18px] rounded [accent-color:var(--primary)]"
                    />
                    <span className="text-(--foreground)">
                        Keep me signed in
                    </span>
                </label>

                <SubmitButton
                    processing={processing}
                    disabled={isThrottled}
                    busyText="Signing in…"
                    className="shell-auth-submit shell-press w-full font-medium"
                >
                    Sign in
                </SubmitButton>

                <div className="min-h-[20px]" aria-live="polite">
                    {showInvalidNow && (
                        <p
                            id="login-error"
                            className="text-[14px] font-medium text-(--destructive)"
                        >
                            That email and password don&apos;t match. Have
                            another go.
                        </p>
                    )}
                </div>
                {isThrottled && (
                    <span
                        role="alert"
                        className="text-[14px] text-(--muted-foreground)"
                    >
                        {throttleMessage}
                    </span>
                )}
            </form>
        </AuthLayout>
    );
}
