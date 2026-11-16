import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/dates';
import { roleLabel } from '@/lib/roles';
import * as invites from '@/routes/admin/invites';
import * as usersRoutes from '@/routes/admin/users';
import Page from '@/Shell/Components/Page';
import Pagination from '@/Shell/Components/Pagination';
import type { PaginationLink } from '@/Shell/Components/Pagination';

interface Role {
    name: string;
}

interface User {
    id: number;
    name: string;
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
    const page = usePage<{
        auth: { user: { roles: string[]; id: number } };
    }>();
    const currentUserId = page.props.auth.user.id;

    const [pendingDelete, setPendingDelete] = useState<User | null>(null);

    const handleDelete = (user: User) => {
        setPendingDelete(user);
    };

    const confirmDelete = () => {
        if (!pendingDelete) {
            return;
        }

        const user = pendingDelete;
        setPendingDelete(null);
        router.delete(usersRoutes.destroy.url({ user: user.id }));
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
            <Link
                href={usersRoutes.edit.url({ user: user.id })}
                aria-label={`Edit ${user.name}`}
                className="os-admin-row-action os-admin-fill-accent shell-press inline-flex items-center justify-center"
            >
                Edit
            </Link>
            <button
                type="button"
                onClick={() => handleDelete(user)}
                disabled={user.id === currentUserId}
                aria-label={
                    user.id === currentUserId
                        ? `Delete ${user.name} (you can't delete yourself)`
                        : `Delete ${user.name}`
                }
                className="os-admin-row-action os-admin-outline-destructive shell-press inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
                Delete
            </button>
        </div>
    );

    return (
        <>
            <Page
                tier="index"
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
                <div className="@container">
                    <div className="os-admin-surface hidden overflow-x-auto border @min-[760px]:block">
                        <Table className="min-w-[640px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Last login</TableHead>
                                    <TableHead className="os-admin-sticky-actions text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="os-admin-strong">
                                            {user.name}
                                        </TableCell>
                                        <TableCell className="os-admin-muted">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            {renderRoleBadges(user)}
                                        </TableCell>
                                        <TableCell className="os-admin-meta">
                                            {formatDate(user.last_login_at, {
                                                fallback: 'Never',
                                            })}
                                        </TableCell>
                                        <TableCell className="os-admin-sticky-actions">
                                            <div className="flex justify-end">
                                                {renderActions(user)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col gap-3 @min-[760px]:hidden">
                        {users.data.map((user) => (
                            <div
                                key={user.id}
                                className="os-admin-surface border p-4"
                            >
                                <div className="mb-3">
                                    <p className="os-admin-strong">
                                        {user.name}
                                    </p>
                                    <p className="os-admin-meta">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="mb-3">
                                    {renderRoleBadges(user)}
                                </div>
                                <p className="os-admin-meta mb-3">
                                    Last login:{' '}
                                    {formatDate(user.last_login_at, {
                                        fallback: 'Never',
                                    })}
                                </p>
                                {renderActions(user)}
                            </div>
                        ))}
                    </div>
                </div>

                <AlertDialog
                    open={pendingDelete !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setPendingDelete(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete {pendingDelete?.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                There's no undo. They'll lose access right away.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                className="os-admin-fill-destructive"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Pagination links={users.meta.links} />
            </Page>
        </>
    );
}
