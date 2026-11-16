import { Link, router, useForm } from '@inertiajs/react';
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
import { formatDate } from '@/lib/dates';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import * as invitesRoutes from '@/routes/admin/invites';
import * as users from '@/routes/admin/users';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import Pagination from '@/Shell/Components/Pagination';
import type { PaginationLink } from '@/Shell/Components/Pagination';
import SubmitButton from '@/Shell/Components/SubmitButton';

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
    variant: 'default' | 'secondary' | 'outline';
} {
    if (invite.accepted_at) {
        return { label: 'Accepted', variant: 'default' };
    }

    if (invite.revoked_at) {
        return { label: 'Revoked', variant: 'outline' };
    }

    if (new Date(invite.expires_at) <= new Date()) {
        return { label: 'Expired', variant: 'outline' };
    }

    return { label: 'Pending', variant: 'secondary' };
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

    const renderActions = (invite: Invitation, inCard = false) =>
        inviteStatus(invite).label === 'Pending' ? (
            <div
                className={cn(
                    'flex items-center gap-2',
                    inCard ? 'justify-start' : 'justify-end',
                )}
            >
                <button
                    type="button"
                    onClick={() => handleResend(invite)}
                    aria-label={`Resend the invite to ${invite.email}`}
                    className="os-admin-row-action os-admin-fill-accent shell-press inline-flex items-center justify-center"
                >
                    Resend
                </button>
                <button
                    type="button"
                    onClick={() => handleRevoke(invite)}
                    aria-label={`Revoke the invite for ${invite.email}`}
                    className="os-admin-row-action os-admin-outline-destructive shell-press inline-flex items-center justify-center"
                >
                    Revoke
                </button>
            </div>
        ) : null;

    return (
        <>
            <Page
                title="Invites"
                room="Admin"
                backChevron
                actions={
                    <>
                        <Link
                            href={users.index.url()}
                            className="os-admin-tap os-admin-tap-center os-admin-fill-accent shell-press px-4 py-2 text-sm font-medium"
                        >
                            View users
                        </Link>
                        <button
                            onClick={() => setShowForm((v) => !v)}
                            className={`os-admin-tap ${showForm ? 'os-admin-fill-accent' : 'os-admin-fill-primary'} shell-press px-4 py-2 text-sm font-medium`}
                        >
                            {showForm ? 'Cancel' : 'Send invite'}
                        </button>
                    </>
                }
            >
                {showForm && (
                    <div className="os-admin-surface mb-6 border p-6">
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
                                        'os-admin-control shell-field block w-full border px-3 py-2.5 outline-none',
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
                                        'os-admin-control shell-field block border px-3 py-2.5 outline-none',
                                        errors.role &&
                                            'os-admin-control--invalid',
                                    )}
                                >
                                    <option value="user">
                                        {roleLabel('user')}
                                    </option>
                                    <option value="admin">
                                        {roleLabel('admin')}
                                    </option>
                                </select>
                            </FormField>
                            <SubmitButton
                                processing={processing}
                                busyText="Sending invite…"
                                className="os-admin-tap os-admin-fill-primary os-admin-submit shell-press px-5 font-medium"
                            >
                                Send invite
                            </SubmitButton>
                        </form>
                    </div>
                )}

                {invites.data.length === 0 ? (
                    <div className="os-admin-surface flex flex-col items-center gap-3 border px-6 py-10 text-center">
                        <MailPlus
                            size={32}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className="os-admin-muted"
                        />
                        <p className="os-admin-muted">No invitations yet.</p>
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="os-admin-tap os-admin-tap-center os-admin-fill-primary shell-press px-4 font-medium"
                        >
                            Send your first invite
                        </button>
                    </div>
                ) : (
                    <div className="@container">
                        <div className="os-admin-surface hidden overflow-x-auto border @min-[760px]:block">
                            <Table className="min-w-[720px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Invited by</TableHead>
                                        <TableHead className="os-admin-sticky-actions text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invites.data.map((invite) => {
                                        const status = inviteStatus(invite);

                                        return (
                                            <TableRow key={invite.id}>
                                                <TableCell className="os-admin-strong">
                                                    {invite.email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {roleLabel(
                                                            invite.role_name,
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={status.variant}
                                                    >
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="os-admin-meta">
                                                    {formatDate(
                                                        invite.expires_at,
                                                    )}
                                                </TableCell>
                                                <TableCell className="os-admin-meta">
                                                    {invite.invited_by?.name ??
                                                        'Someone since removed'}
                                                </TableCell>
                                                <TableCell className="os-admin-sticky-actions text-right">
                                                    {renderActions(invite)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <ul className="flex flex-col gap-3 @min-[760px]:hidden">
                            {invites.data.map((invite) => {
                                const status = inviteStatus(invite);

                                return (
                                    <li
                                        key={invite.id}
                                        className="os-admin-surface border p-4"
                                    >
                                        <p className="os-admin-strong break-all">
                                            {invite.email}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">
                                                {roleLabel(invite.role_name)}
                                            </Badge>
                                            <Badge variant={status.variant}>
                                                {status.label}
                                            </Badge>
                                        </div>
                                        <p className="os-admin-meta mt-2">
                                            Expires{' '}
                                            {formatDate(invite.expires_at)}
                                            {invite.invited_by &&
                                                ` · invited by ${invite.invited_by.name}`}
                                        </p>
                                        {status.label === 'Pending' && (
                                            <div className="mt-3">
                                                {renderActions(invite, true)}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

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
        </>
    );
}
