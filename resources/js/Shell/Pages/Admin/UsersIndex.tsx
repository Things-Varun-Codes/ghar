import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/dates';
import { roleLabel } from '@/lib/roles';
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
    roles: Role[];
}

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
    const [deleting, setDeleting] = useState<User | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleDelete = (user: User) => {
        setDeleting(user);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(usersRoutes.destroy.url({ user: deleting.id }));
    };

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
        </div>
    );

    const renderActions = (user: User) => (
        <div className="flex items-center gap-2">
            <Button
                nativeButton={false}
                render={<Link href={usersRoutes.edit.url({ user: user.id })} />}
                aria-label={`Edit ${user.name}`}
                variant="outline"
                className="os-admin-row-action os-admin-fill-accent shell-press"
            >
                Edit
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleDelete(user)}
                disabled={user.id === currentUserId}
                aria-label={
                    user.id === currentUserId
                        ? `Delete ${user.name} (you can't delete yourself)`
                        : `Delete ${user.name}`
                }
                className="os-admin-row-action os-admin-outline-destructive shell-press disabled:cursor-not-allowed disabled:opacity-40"
            >
                Delete
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
                formatDate(user.last_login_at, { fallback: 'Never' }),
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
                    title={`Delete ${deleting?.name ?? 'this person'}?`}
                    description="There's no undo. They'll lose access right away."
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={confirmDelete}
                />

                <Pagination links={users.meta.links} />
            </Page>
        </>
    );
}
