import { useForm, usePage } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { formSubmitOptions } from '@/lib/mutation';
import * as profile from '@/routes/settings/profile';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import ProfilePictureField from '@/Shell/Components/ProfilePictureField';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

interface Props {
    user: Person & {
        email: string;
        /* YYYY-MM-DD, or null until they set one. */
        birthday: string | null;
    };
}

interface SharedProps {
    flash?: { status?: string };
    today: string;
    [k: string]: unknown;
}

const EMAIL_PENDING_STATUS = 'profile-updated-email-pending';
const FIELDS = new Set(['name', 'email', 'birthday']);

export default function Profile({ user }: Props) {
    const { flash, today } = usePage<SharedProps>().props;
    const { data, setData, patch, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        birthday: user.birthday ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(profile.update.url(), {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Settings/Profile',
                action: 'profile.update',
                isShownField: (key) => FIELDS.has(key),
            }),
        });
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
                    <ProfilePictureField person={user} />

                    <Separator className="my-6" />

                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Name"
                            name="name"
                            error={errors.name}
                            required
                        >
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="os-settings-input"
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
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="os-settings-input"
                                autoComplete="email"
                                required
                            />
                        </FormField>

                        <FormField
                            label="Birthday"
                            name="birthday"
                            error={errors.birthday}
                            helper={
                                user.birthday
                                    ? 'The whole date. You can change it, but not clear it.'
                                    : 'The whole date: day, month and year.'
                            }
                            required={user.birthday !== null}
                        >
                            <Input
                                id="birthday"
                                name="birthday"
                                type="date"
                                value={data.birthday}
                                onChange={(e) =>
                                    setData('birthday', e.target.value)
                                }
                                className="os-settings-input"
                                autoComplete="bday"
                                min="1900-01-01"
                                max={today}
                                required={user.birthday !== null}
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
            </Page>
        </>
    );
}
