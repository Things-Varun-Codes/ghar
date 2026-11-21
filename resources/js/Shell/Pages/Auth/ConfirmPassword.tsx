import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import PasswordInput from '@/components/password-input';
import { store } from '@/routes/password/confirm';
import AuthLayout from '@/Shell/Components/AuthLayout';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

export default function ConfirmPassword() {
    const { auth } = usePage<{ auth: { user: { email: string } } }>().props;
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // A wrong password is expected input and shows on the page.
        post(store.url(), { onFinish: () => reset() });
    };

    return (
        <AuthLayout
            title="Confirm it's you."
            subtitle="Enter your password to change how you sign in."
        >
            <Head title="Confirm password" />

            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                {/* sr-only, not display:none: password managers ignore hidden inputs. */}
                <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={auth.user.email}
                    readOnly
                    aria-hidden="true"
                    tabIndex={-1}
                    className="sr-only"
                />
                <FormField
                    label="Password"
                    name="password"
                    error={errors.password}
                >
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="shell-auth-password"
                        autoFocus
                        required
                    />
                </FormField>

                <SubmitButton
                    processing={processing}
                    busyText="Checking…"
                    className="shell-auth-submit shell-press w-full font-medium"
                >
                    Continue
                </SubmitButton>
            </form>
        </AuthLayout>
    );
}
