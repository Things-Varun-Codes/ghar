import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import PasswordInput from '@/components/password-input';
import * as accept from '@/routes/invitations/accept';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface Props {
    email: string;
    token: string;
    errors?: Record<string, string>;
}

export default function InviteAccept({ email, token }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
        token: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(accept.store.url({ token }));
    };

    return (
        <AuthLayout
            title="Make yourself at home"
            subtitle={
                <>
                    Joining as <strong>{email}</strong>
                </>
            }
            tagline="Pick a name and a password and you're in."
        >
            <Head title="Accept your invitation" />

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <FormField label="Your name" name="name" error={errors.name}>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="shell-auth-field block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        style={{
                            borderColor: errors.name
                                ? 'var(--destructive)'
                                : 'var(--border)',
                        }}
                        placeholder="Your name"
                        required
                    />
                </FormField>

                <FormField
                    label="Password"
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
                >
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        className="shell-auth-password block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                        placeholder="••••••••"
                        required
                    />
                </FormField>

                <SubmitButton
                    processing={processing}
                    busyText="Accepting…"
                    className="shell-auth-submit w-full rounded-lg font-semibold"
                >
                    Create account
                </SubmitButton>

                {errors.token && (
                    <div aria-live="polite">
                        <p className="text-[14px] text-(--destructive)">
                            {errors.token}
                        </p>
                    </div>
                )}
            </form>
        </AuthLayout>
    );
}
