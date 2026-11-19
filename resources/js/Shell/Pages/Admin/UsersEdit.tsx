import { Link, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import * as users from '@/routes/admin/users';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        roles: string[];
    };
}

export default function UsersEdit({ user }: Props) {
    const currentRole = user.roles[0] ?? 'user';

    const { data, setData, patch, processing, errors } = useForm({
        role: currentRole,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(users.update.url({ user: user.id }));
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
                                    className={cn(
                                        'os-admin-control w-full',
                                        errors.role &&
                                            'os-admin-control--invalid',
                                    )}
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
                                className="os-admin-tap os-admin-tap-center os-admin-cancel-link shell-press shell-focus rounded-full px-5 font-medium"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </Page>
        </>
    );
}
