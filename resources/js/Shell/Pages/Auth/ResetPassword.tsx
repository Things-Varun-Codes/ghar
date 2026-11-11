import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import PasswordInput from '@/components/password-input';
import { update } from '@/routes/password';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface Props {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(update.url());
    };

    const confirmFieldError =
        errors.password_confirmation ??
        (errors.password?.toLowerCase().includes('confirm')
            ? errors.password
            : undefined);

    return (
        <AuthLayout title="Set a new password">
            <Head title="Reset password" />

            <input type="hidden" name="token" value={data.token} />

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <FormField label="Email" name="email" error={errors.email}>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={data.email}
                        readOnly
                        className="shell-auth-field-readonly block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                            borderColor: errors.email
                                ? 'var(--destructive)'
                                : 'var(--border)',
                        }}
                        autoComplete="username"
                    />
                </FormField>

                <FormField
                    label="New password"
                    name="password"
                    error={errors.password}
                >
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="shell-auth-field block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                            borderColor: errors.password
                                ? 'var(--destructive)'
                                : 'var(--border)',
                        }}
                        placeholder="••••••••"
                        required
                    />
                </FormField>

                <FormField
                    label="Confirm password"
                    name="password_confirmation"
                    error={confirmFieldError}
                >
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        className="shell-auth-field block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                            borderColor: confirmFieldError
                                ? 'var(--destructive)'
                                : 'var(--border)',
                        }}
                        placeholder="••••••••"
                        required
                    />
                </FormField>

                <SubmitButton
                    processing={processing}
                    busyText="Resetting…"
                    className="shell-auth-submit w-full rounded-lg font-semibold"
                >
                    Reset password
                </SubmitButton>
            </form>
        </AuthLayout>
    );
}
