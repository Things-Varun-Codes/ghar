import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formSubmitOptions, mutationOptions } from '@/lib/mutation';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import * as users from '@/routes/admin/users';
import * as userPicture from '@/routes/admin/users/picture';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

interface Props {
    user: Person & {
        email: string;
        /* YYYY-MM-DD, or null until someone sets it. */
        birthday: string | null;
        roles: string[];
    };
}

const FIELDS = new Set(['role', 'birthday']);

export default function UsersEdit({ user }: Props) {
    const currentRole = user.roles[0] ?? 'user';

    const { today } = usePage<{ today: string }>().props;
    const firstName = user.name.split(' ')[0];

    const { data, setData, patch, processing, errors } = useForm({
        role: currentRole,
        birthday: user.birthday ?? '',
    });

    const [confirmingRemove, setConfirmingRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(
            users.update.url({ user: user.id }),
            formSubmitOptions({
                component: 'Admin/UsersEdit',
                action: 'users.update',
                isShownField: (key) => FIELDS.has(key),
            }),
        );
    };

    // An admin may take a picture down but never put one up: that is each person's own.
    const removePicture = () => {
        router.delete(userPicture.destroy.url({ user: user.id }), {
            preserveScroll: true,
            ...mutationOptions({
                component: 'Admin/UsersEdit',
                action: 'users.picture.remove',
                onPendingChange: setRemoving,
            }),
        });
    };

    return (
        <>
            <Page
                tier="prose"
                title="Edit user"
                room="Admin"
                documentTitle={`Edit ${user.name}`}
                back={{ href: users.index.url(), label: 'Users' }}
                subtitle={`${user.name} · ${user.email}`}
            >
                <div className="os-admin-surface border p-6">
                    <div className="mb-6 flex items-center gap-4">
                        <PersonAvatar person={user} size={44} />
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                            <p className="os-admin-meta">
                                {user.avatar_url
                                    ? `${firstName}'s picture`
                                    : `${firstName} hasn't added a picture.`}
                            </p>
                            {user.avatar_url && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="os-admin-outline-destructive shell-press"
                                    onClick={() => setConfirmingRemove(true)}
                                    disabled={removing}
                                >
                                    Remove picture
                                </Button>
                            )}
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Role"
                            name="role"
                            error={errors.role}
                            required
                        >
                            <Select
                                value={data.role}
                                items={{
                                    user: roleLabel('user'),
                                    admin: roleLabel('admin'),
                                }}
                                onValueChange={(value) => {
                                    if (value !== null) {
                                        setData('role', value);
                                    }
                                }}
                            >
                                <SelectTrigger
                                    id="role"
                                    aria-label="Role"
                                    className="os-admin-control w-full"
                                    aria-invalid={
                                        errors.role ? true : undefined
                                    }
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">
                                        {roleLabel('user')}
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        {roleLabel('admin')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField
                            label="Birthday"
                            name="birthday"
                            error={errors.birthday}
                            helper={
                                user.birthday
                                    ? 'The whole date. It can be changed, but not cleared.'
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
                                className="os-admin-control"
                                min="1900-01-01"
                                max={today}
                                required={user.birthday !== null}
                            />
                        </FormField>

                        <div className="flex items-center gap-3 pt-2">
                            <SubmitButton
                                processing={processing}
                                busyText="Saving…"
                                className="os-admin-tap os-admin-fill-primary os-admin-submit shell-press px-5 font-medium"
                            >
                                Save changes
                            </SubmitButton>
                            <Link
                                href={users.index.url()}
                                className={cn(
                                    buttonVariants({ variant: 'ghost' }),
                                    'os-admin-cancel-link shell-press px-5',
                                )}
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>

                <ConfirmDialog
                    open={confirmingRemove}
                    onOpenChange={setConfirmingRemove}
                    title={`Remove ${firstName}'s picture?`}
                    description={`Their initials show in its place. Only ${firstName} can add a new one.`}
                    confirmLabel="Remove"
                    variant="destructive"
                    onConfirm={removePicture}
                />
            </Page>
        </>
    );
}
