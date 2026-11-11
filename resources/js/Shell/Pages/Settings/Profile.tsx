import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import * as password from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

interface Props {
    user: {
        name: string;
        email: string;
    };
}

interface SharedProps {
    flash?: { status?: string };
    [k: string]: unknown;
}

const EMAIL_PENDING_STATUS = 'profile-updated-email-pending';

export default function Profile({ user }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(profile.update.url());
    };

    return (
        <AppLayout>
            <Head title="Profile — Settings" />

            <Page tier="prose" title="Profile" backChevron>
                {flash?.status === EMAIL_PENDING_STATUS && (
                    <p className="os-settings-notice mb-6" role="status">
                        Saved. Check the new email for a verification link.
                    </p>
                )}

                <div className="os-settings-card rounded-xl p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Name"
                            name="name"
                            error={errors.name}
                            required
                        >
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="os-settings-input block w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                                autoComplete="name"
                                required
                            />
                        </FormField>

                        <FormField
                            label="Email"
                            name="email"
                            error={errors.email}
                            helper="We'll send a link to the new address. Your email changes once you click it."
                            required
                        >
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="os-settings-input block w-full rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1"
                                autoComplete="email"
                                required
                            />
                        </FormField>

                        <div className="pt-2">
                            <SubmitButton
                                processing={processing}
                                busyText="Saving…"
                                className="os-settings-submit rounded-lg px-5"
                            >
                                Save
                            </SubmitButton>
                        </div>
                    </form>
                </div>

                <div className="mt-4 text-right">
                    <a href={password.show.url()} className="os-settings-link">
                        Change password →
                    </a>
                </div>
            </Page>
        </AppLayout>
    );
}
