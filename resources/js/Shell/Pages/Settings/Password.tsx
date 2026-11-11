import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import PasswordInput from '@/components/password-input';
import * as passwordRoute from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

export default function Password() {
    const { auth } = usePage<{ auth: { user: { email: string } } }>().props;
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(passwordRoute.update.url(), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AppLayout>
            <Head title="Password — Settings" />

            <Page tier="prose" title="Password" backChevron>
                <div className="os-settings-card rounded-xl p-6">
                    <form onSubmit={submit} className="space-y-5">
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
                            label="Current password"
                            name="current_password"
                            error={errors.current_password}
                            required
                        >
                            <PasswordInput
                                id="current_password"
                                value={data.current_password}
                                onChange={(e) =>
                                    setData('current_password', e.target.value)
                                }
                                className="os-settings-input block w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                                autoComplete="current-password"
                                required
                            />
                        </FormField>

                        <FormField
                            label="New password"
                            name="password"
                            error={errors.password}
                            required
                        >
                            <PasswordInput
                                id="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="os-settings-input block w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                                autoComplete="new-password"
                                required
                            />
                        </FormField>

                        <FormField
                            label="Confirm new password"
                            name="password_confirmation"
                            required
                        >
                            <PasswordInput
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                className="os-settings-input block w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                                autoComplete="new-password"
                                required
                            />
                        </FormField>

                        <div className="pt-2">
                            <SubmitButton
                                processing={processing}
                                busyText="Updating…"
                                className="os-settings-submit rounded-lg px-5"
                            >
                                Save
                            </SubmitButton>
                        </div>
                    </form>
                </div>

                <div className="mt-4 text-right">
                    <a href={profile.show.url()} className="os-settings-link">
                        ← Back to profile
                    </a>
                </div>
            </Page>
        </AppLayout>
    );
}
