import { Head, Link, router, useForm } from '@inertiajs/react';
import { MailPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';
import * as invitesRoutes from '@/routes/admin/invites';
import * as users from '@/routes/admin/users';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import Pagination from '@/Shell/Components/Pagination';
import type { PaginationLink } from '@/Shell/Components/Pagination';
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

interface Inviter {
    id: number;
    name: string;
}

interface Invitation {
    id: number;
    email: string;
    role_name: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
    invited_by: Inviter | null;
}

interface PaginatedInvites {
    data: Invitation[];
    links: PaginationLink[];
}

interface Props {
    invites: PaginatedInvites;
}

function inviteStatus(invite: Invitation): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
    if (invite.accepted_at) {
        return { label: 'accepted', variant: 'default' };
    }

    if (invite.revoked_at) {
        return { label: 'revoked', variant: 'destructive' };
    }

    if (new Date(invite.expires_at) <= new Date()) {
        return { label: 'expired', variant: 'outline' };
    }

    return { label: 'pending', variant: 'secondary' };
}

export default function InvitesIndex({ invites }: Props) {
    const [showForm, setShowForm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'user',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(invitesRoutes.store.url(), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    const [pendingRevoke, setPendingRevoke] = useState<Invitation | null>(null);
    const [pendingResend, setPendingResend] = useState<Invitation | null>(null);

    const handleRevoke = (invite: Invitation) => {
        setPendingRevoke(invite);
    };

    const confirmRevoke = () => {
        if (!pendingRevoke) {
            return;
        }

        const invite = pendingRevoke;
        setPendingRevoke(null);
        router.delete(invitesRoutes.destroy.url({ invite: invite.id }));
    };

    const handleResend = (invite: Invitation) => {
        setPendingResend(invite);
    };

    const confirmResend = () => {
        if (!pendingResend) {
            return;
        }

        const invite = pendingResend;
        setPendingResend(null);
        router.post(invitesRoutes.resend.url({ invite: invite.id }));
    };

    return (
        <AppLayout>
            <Head title="Invitations — Admin" />

            <Page
                tier="index"
                title="Invites"
                backChevron
                actions={
                    <>
                        <Link
                            href={users.index.url()}
                            className="os-admin-tap os-admin-tap-center os-admin-fill-accent rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                        >
                            View Users
                        </Link>
                        <button
                            onClick={() => setShowForm((v) => !v)}
                            className={`os-admin-tap ${showForm ? 'os-admin-fill-accent' : 'os-admin-fill-primary'} rounded-lg px-4 py-2 text-sm font-semibold transition-colors`}
                        >
                            {showForm ? 'Cancel' : 'Send invite'}
                        </button>
                    </>
                }
            >
                {showForm && (
                    <div className="os-admin-surface mb-6 rounded-xl border p-6">
                        <h2 className="os-admin-section-title mb-4">
                            Send invitation
                        </h2>
                        <form
                            onSubmit={submit}
                            className="flex flex-wrap items-end gap-3"
                        >
                            <FormField
                                label="Email"
                                name="invite-email"
                                error={errors.email}
                                className="min-w-[200px] flex-1"
                            >
                                <input
                                    id="invite-email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    placeholder="invitee@example.com"
                                    className={cn(
                                        'os-admin-control block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
                                        errors.email &&
                                            'os-admin-control--invalid',
                                    )}
                                    required
                                />
                            </FormField>
                            <FormField
                                label="Role"
                                name="invite-role"
                                error={errors.role}
                            >
                                <select
                                    id="invite-role"
                                    value={data.role}
                                    onChange={(e) =>
                                        setData('role', e.target.value)
                                    }
                                    className={cn(
                                        'os-admin-control block rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
                                        errors.role &&
                                            'os-admin-control--invalid',
                                    )}
                                >
                                    <option value="user">user</option>
                                    <option value="admin">admin</option>
                                </select>
                            </FormField>
                            <SubmitButton
                                processing={processing}
                                busyText="Sending invite…"
                                className="os-admin-tap os-admin-fill-primary os-admin-submit rounded-lg px-5 font-semibold"
                            >
                                Send invite
                            </SubmitButton>
                        </form>
                    </div>
                )}

                <div className="os-admin-surface overflow-x-auto rounded-xl border">
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Invited by</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invites.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10">
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <MailPlus
                                                size={32}
                                                strokeWidth={1.5}
                                                aria-hidden="true"
                                                className="os-admin-muted"
                                            />
                                            <p className="os-admin-muted">
                                                No invitations yet.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowForm(true)
                                                }
                                                className="os-admin-tap os-admin-tap-center os-admin-fill-primary rounded-lg px-4 font-semibold transition-colors hover:opacity-90"
                                            >
                                                Send your first invite
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {invites.data.map((invite) => {
                                const status = inviteStatus(invite);
                                const isPending = status.label === 'pending';

                                return (
                                    <TableRow key={invite.id}>
                                        <TableCell className="os-admin-strong">
                                            {invite.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {invite.role_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status.variant}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="os-admin-meta">
                                            {formatDate(invite.expires_at)}
                                        </TableCell>
                                        <TableCell className="os-admin-meta">
                                            {invite.invited_by?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isPending && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleResend(invite)
                                                        }
                                                        className="os-admin-row-action os-admin-fill-accent inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:opacity-80"
                                                    >
                                                        Resend
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleRevoke(invite)
                                                        }
                                                        className="os-admin-row-action os-admin-outline-destructive inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:opacity-80"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <ConfirmDialog
                    open={pendingRevoke !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setPendingRevoke(null);
                        }
                    }}
                    title={`Revoke the invite for ${pendingRevoke?.email}?`}
                    description="The link will stop working right away."
                    confirmLabel="Revoke"
                    onConfirm={confirmRevoke}
                    variant="destructive"
                />

                <ConfirmDialog
                    open={pendingResend !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setPendingResend(null);
                        }
                    }}
                    title={`Resend the invite to ${pendingResend?.email}?`}
                    description="The old link will stop working."
                    confirmLabel="Resend"
                    onConfirm={confirmResend}
                />

                <Pagination links={invites.links} />
            </Page>
        </AppLayout>
    );
}
