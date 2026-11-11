import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { login } from '@/routes';
import { email } from '@/routes/password';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface Props {
    status?: string;
}

export default function ForgotPassword({ status }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(email.url());
    };

    return (
        <AuthLayout
            title="Locked out?"
            subtitle="Enter your email and we'll send a reset link."
        >
            <Head title="Forgot password" />

            {status && (
                <div
                    className="mt-4 rounded-lg bg-(--accent) px-4 py-3 text-[14px] text-(--foreground)"
                    role="status"
                >
                    {status}
                </div>
            )}

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <FormField label="Email" name="email" error={errors.email}>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="shell-auth-field block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                            borderColor: errors.email
                                ? 'var(--destructive)'
                                : 'var(--border)',
                        }}
                        placeholder="you@example.com"
                        required
                    />
                </FormField>

                <SubmitButton
                    processing={processing}
                    busyText="Sending…"
                    className="shell-auth-submit w-full rounded-lg font-semibold"
                >
                    Send reset link
                </SubmitButton>

                <div className="flex justify-center">
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
