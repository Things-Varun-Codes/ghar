import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatInstant } from '@/lib/dates';
import { mutationOptions } from '@/lib/mutation';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import * as invites from '@/routes/admin/invites';
import * as usersRoutes from '@/routes/admin/users';
import AdminCollection from '@/Shell/Components/AdminCollection';
import type { AdminColumn } from '@/Shell/Components/AdminCollection';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import Page from '@/Shell/Components/Page';
import Pagination from '@/Shell/Components/Pagination';
import type { PaginationLink } from '@/Shell/Components/Pagination';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Auth } from '@/types/auth';
import type { Person } from '@/types/person';

interface Role {
    name: string;
}

interface User extends Person {
    email: string;
    last_login_at: string | null;
    two_factor: boolean;
    roles: Role[];
    removed_at: string | null;
}

type Confirming = { user: User; action: 'remove' | 'delete' };

interface PaginatedUsers {
    data: User[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        links: PaginationLink[];
    };
}

interface Props {
    users: PaginatedUsers;
}

export default function UsersIndex({ users }: Props) {
    const currentUserId = usePage<{ auth: Auth }>().props.auth.user?.id;

    // Kept after the dialog closes, so its title doesn't empty while it fades out.
    const [confirming, setConfirming] = useState<Confirming | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const ask = (user: User, action: Confirming['action']) => {
        setConfirming({ user, action });
        setConfirmOpen(true);
    };

    const confirm = () => {
        if (!confirming) {
            return;
        }

        const { user, action } = confirming;
        // A refusal (the last admin, something still saved) comes back as a toast.
        const options = {
            preserveScroll: true,
            ...mutationOptions({ component: 'Admin/UsersIndex', action }),
        };

        if (action === 'remove') {
            router.post(usersRoutes.remove.url({ user: user.id }), {}, options);
        } else {
            router.delete(usersRoutes.destroy.url({ user: user.id }), options);
        }
    };

    const restore = (user: User) => {
        router.post(
            usersRoutes.restore.url({ user: user.id }),
            {},
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Admin/UsersIndex',
                    action: 'restore',
                }),
            },
        );
    };

    const removing = confirming?.action !== 'delete';
    const confirmName = confirming?.user.name ?? 'this person';

    const renderRoleBadges = (user: User) => (
        <div className="flex flex-wrap items-center gap-1">
            {user.roles.map((role) => (
                <Badge
                    key={role.name}
                    variant={role.name === 'admin' ? 'default' : 'secondary'}
                >
                    {roleLabel(role.name)}
                </Badge>
            ))}
            {user.removed_at !== null && (
                <Badge variant="outline">Former member</Badge>
            )}
            {user.two_factor && <Badge variant="outline">Two-step</Badge>}
        </div>
    );

    const renderActions = (user: User) =>
        user.removed_at !== null ? (
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => restore(user)}
                    aria-label={`Restore ${user.name}`}
                    className="os-admin-row-action os-admin-fill-accent shell-press"
                >
                    Restore
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => ask(user, 'delete')}
                    aria-label={`Delete ${user.name} for good`}
                    className="os-admin-row-action os-admin-outline-destructive shell-press"
                >
                    Delete
                </Button>
            </div>
        ) : (
            <div className="flex items-center gap-2">
                <Link
                    href={usersRoutes.edit.url({ user: user.id })}
                    className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'os-admin-row-action os-admin-fill-accent shell-press',
                    )}
                    aria-label={`Edit ${user.name}`}
                >
                    Edit
                </Link>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => ask(user, 'remove')}
                    disabled={user.id === currentUserId}
                    aria-label={
                        user.id === currentUserId
                            ? `Remove ${user.name} (you can't remove yourself)`
                            : `Remove ${user.name}`
                    }
                    className="os-admin-row-action os-admin-outline-destructive shell-press disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Remove
                </Button>
            </div>
        );

    const columns: AdminColumn<User>[] = [
        {
            header: 'Name',
            cell: (user) => (
                <span className="inline-flex items-center gap-3">
                    <PersonAvatar person={user} size={32} />
                    {user.name}
                </span>
            ),
            className: 'os-admin-strong',
            card: { as: 'title' },
        },
        {
            header: 'Email',
            cell: (user) => user.email,
            className: 'os-admin-muted',
            card: { as: 'subtitle' },
        },
        {
            header: 'Role',
            cell: renderRoleBadges,
            card: { as: 'block', className: 'mb-3' },
        },
        {
            header: 'Last login',
            cell: (user) =>
                formatInstant(user.last_login_at, { fallback: 'Never' }),
            className: 'os-admin-meta',
            card: { as: 'meta', label: 'Last login', className: 'mb-3' },
        },
    ];

    return (
        <>
            <Page
                title="Users"
                room="Admin"
                backChevron
                actions={
                    <Link
                        href={invites.index.url()}
                        className="os-admin-tap os-admin-tap-center os-admin-fill-primary shell-press px-4 py-2 text-sm font-medium"
                    >
                        Manage invites
                    </Link>
                }
            >
                <AdminCollection
                    columns={columns}
                    rows={users.data}
                    rowKey={(user) => user.id}
                    actions={{
                        cell: (user) => (
                            <div className="flex justify-end">
                                {renderActions(user)}
                            </div>
                        ),
                        card: renderActions,
                    }}
                    tableClassName="min-w-[640px]"
                />

                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title={
                        removing
                            ? `Remove ${confirmName} from the household?`
                            : `Delete ${confirmName} for good?`
                    }
                    description={
                        removing
                            ? "They're signed out and can't sign in. What they made stays, shown as theirs, and any balance with them can still be settled. You can restore them later."
                            : "There's no undo. This only works for someone who left nothing behind."
                    }
                    confirmLabel={removing ? 'Remove' : 'Delete'}
                    variant="destructive"
                    onConfirm={confirm}
                />

                <Pagination links={users.meta.links} />
            </Page>
        </>
    );
}
