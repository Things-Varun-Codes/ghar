import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import * as users from '@/routes/admin/users';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

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
        <AppLayout>
            <Head title={`Edit ${user.name} — Admin`} />

            <Page
                tier="prose"
                title="Edit user"
                backChevron
                subtitle={`${user.name} — ${user.email}`}
            >
                <div className="os-admin-surface rounded-xl border p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <FormField
                            label="Role"
                            name="role"
                            error={errors.role}
                            required
                        >
                            <Select
                                value={data.role}
                                onValueChange={(value) =>
                                    setData('role', value)
                                }
                            >
                                <SelectTrigger
                                    id="role"
                                    aria-label="Role"
                                    className={cn(
                                        'os-admin-control block w-full rounded-lg',
                                        errors.role &&
                                            'os-admin-control--invalid',
                                    )}
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">user</SelectItem>
                                    <SelectItem value="admin">admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <div className="flex items-center gap-3 pt-2">
                            <SubmitButton
                                processing={processing}
                                busyText="Saving…"
                                className="os-admin-tap os-admin-fill-primary os-admin-submit rounded-lg px-5 font-semibold"
                            >
                                Save changes
                            </SubmitButton>
                            <a
                                href={users.index.url()}
                                className="os-admin-tap os-admin-tap-center os-admin-cancel-link rounded-lg px-5 font-medium transition-colors"
                            >
                                Cancel
                            </a>
                        </div>
                    </form>
                </div>
            </Page>
        </AppLayout>
    );
}
