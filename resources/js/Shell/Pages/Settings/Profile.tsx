import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { FormEventHandler } from 'react';
import * as password from '@/routes/settings/password';
import * as profile from '@/routes/settings/profile';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';

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
        <>
            <Page tier="prose" title="Profile" room="Settings" backChevron>
                {flash?.status === EMAIL_PENDING_STATUS && (
                    <p className="os-settings-notice mb-6" role="status">
                        Saved. We sent a verification link to your new address.
                    </p>
                )}

                <div className="os-settings-card p-6">
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
                                className="os-settings-input shell-field block w-full px-3 py-2.5 outline-none"
                                autoComplete="name"
                                required
                            />
                        </FormField>

                        <FormField
                            label="Email"
                            name="email"
                            error={errors.email}
                            helper="If you change it, we'll send a link to the new address. Your email changes once you click it."
                            required
                        >
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="os-settings-input shell-field block w-full px-3 py-2.5 outline-none"
                                autoComplete="email"
                                required
                            />
                        </FormField>

                        <div className="pt-2">
                            <SubmitButton
                                processing={processing}
                                busyText="Saving…"
                                className="os-settings-submit shell-press px-5"
                            >
                                Save
                            </SubmitButton>
                        </div>
                    </form>
                </div>

                <div className="mt-4 text-right">
                    <Link
                        href={password.show.url()}
                        className="os-settings-link shell-focus"
                    >
                        Change password
                        <ArrowRight
                            size={16}
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            </Page>
        </>
    );
}
