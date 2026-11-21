import { Link, router, useForm } from '@inertiajs/react';
import { MailPlus } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { formatInstant } from '@/lib/dates';
import { formSubmitOptions } from '@/lib/mutation';
import { roleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import * as invitesRoutes from '@/routes/admin/invites';
import * as users from '@/routes/admin/users';
import AdminCollection from '@/Shell/Components/AdminCollection';
import type { AdminColumn } from '@/Shell/Components/AdminCollection';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
import EmptyState from '@/Shell/Components/EmptyState';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import Pagination from '@/Shell/Components/Pagination';
import type { PaginationLink } from '@/Shell/Components/Pagination';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';
import type { Person } from '@/types/person';

interface Invitation {
    id: number;
    email: string;
    role_name: string;
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
    invited_by: Person | null;
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

const ROLE_ITEMS = { user: roleLabel('user'), admin: roleLabel('admin') };
const INVITE_FIELDS = new Set(['email', 'role']);

function InviteDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({ email: '', role: 'user' });
    const { data, setData, post, processing, errors, reset, clearErrors } =
        form;

    const close = () => onOpenChange(false);
    const gate = useDraftCloseGate({
        open,
        isDirty: form.isDirty,
        onClose: close,
        onDiscard: () => {
            reset();
            clearErrors();
        },
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(
            invitesRoutes.store.url(),
            formSubmitOptions({
                component: 'Admin/InvitesIndex',
                action: 'invites.store',
                isShownField: (key) => INVITE_FIELDS.has(key),
                onSuccess: () => {
                    reset();
                    close();
                },
            }),
        );
    };

    return (
        <Dialog open={open} onOpenChange={gate.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-display text-(length:--text-title) font-semibold">
                        Send an invite
                    </DialogTitle>
                </DialogHeader>
                <form
                    id="invite-form"
                    onSubmit={submit}
                    className="flex flex-col gap-5"
                >
                    <FormField
                        label="Email"
                        name="invite-email"
                        error={errors.email}
                        required
                    >
                        <Input
                            id="invite-email"
                            name="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="invitee@example.com"
                            className="os-admin-control"
                            autoComplete="off"
                            required
                        />
                    </FormField>
                    <FormField
                        label="Role"
                        name="invite-role"
                        error={errors.role}
                    >
                        <Select
                            value={data.role}
                            items={ROLE_ITEMS}
                            onValueChange={(value) => {
                                if (value !== null) {
                                    setData('role', value);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="invite-role"
                                className="os-admin-control w-full"
                                aria-invalid={errors.role ? true : undefined}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">
                                    {ROLE_ITEMS.user}
                                </SelectItem>
                                <SelectItem value="admin">
                                    {ROLE_ITEMS.admin}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </FormField>
                </form>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        className="shell-press"
                        onClick={gate.requestClose}
                    >
                        Cancel
                    </Button>
                    <SubmitButton
                        form="invite-form"
                        processing={processing}
                        busyText="Sending invite…"
                        className="os-admin-fill-primary os-admin-submit shell-press px-5"
                    >
                        Send invite
                    </SubmitButton>
                </DialogFooter>
                <DiscardDraftDialog
                    {...gate.prompt}
                    title="Discard this invite?"
                    description="The address you typed won't be kept."
                />
            </DialogContent>
        </Dialog>
    );
}

export default function InvitesIndex({ invites }: Props) {
    const [showForm, setShowForm] = useState(false);

    // The invite stays after its dialog closes, so the title doesn't empty while it fades out.
    const [target, setTarget] = useState<Invitation | null>(null);
    const [asking, setAsking] = useState<'revoke' | 'resend' | null>(null);

    const ask = (question: 'revoke' | 'resend', invite: Invitation) => {
        setTarget(invite);
        setAsking(question);
    };

    const handleRevoke = (invite: Invitation) => ask('revoke', invite);
    const handleResend = (invite: Invitation) => ask('resend', invite);

    const confirmRevoke = () => {
        if (target) {
            router.delete(invitesRoutes.destroy.url({ invite: target.id }));
        }
    };

    const confirmResend = () => {
        if (target) {
            router.post(invitesRoutes.resend.url({ invite: target.id }));
        }
    };

    const renderActions = (invite: Invitation, inCard = false) =>
        inviteStatus(invite).label === 'Pending' ? (
            <div
                className={cn(
                    'flex items-center gap-2',
                    inCard ? 'justify-start' : 'justify-end',
                )}
            >
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleResend(invite)}
                    aria-label={`Resend the invite to ${invite.email}`}
                    className="os-admin-row-action os-admin-fill-accent shell-press"
                >
                    Resend
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRevoke(invite)}
                    aria-label={`Revoke the invite for ${invite.email}`}
                    className="os-admin-row-action os-admin-outline-destructive shell-press"
                >
                    Revoke
                </Button>
            </div>
        ) : null;

    const roleBadge = (invite: Invitation) => (
        <Badge variant="outline">{roleLabel(invite.role_name)}</Badge>
    );

    const statusBadge = (invite: Invitation) => {
        const status = inviteStatus(invite);

        return <Badge variant={status.variant}>{status.label}</Badge>;
    };

    const columns: AdminColumn<Invitation>[] = [
        {
            header: 'Email',
            cell: (invite) => invite.email,
            className: 'os-admin-strong',
            card: { as: 'title', className: 'break-all' },
        },
        {
            header: 'Role',
            cell: roleBadge,
            card: {
                as: 'block',
                className: 'mt-2 flex flex-wrap items-center gap-2',
                render: (invite) => (
                    <>
                        {roleBadge(invite)}
                        {statusBadge(invite)}
                    </>
                ),
            },
        },
        { header: 'Status', cell: statusBadge, card: 'hidden' },
        {
            header: 'Expires',
            cell: (invite) => formatInstant(invite.expires_at),
            className: 'os-admin-meta',
            card: {
                as: 'meta',
                className: 'mt-2',
                render: (invite) => (
                    <>
                        Expires {formatInstant(invite.expires_at)}
                        {invite.invited_by && (
                            <>
                                {' · invited by '}
                                <Inviter person={invite.invited_by} />
                            </>
                        )}
                    </>
                ),
            },
        },
        {
            header: 'Invited by',
            cell: (invite) =>
                invite.invited_by ? (
                    <Inviter person={invite.invited_by} />
                ) : (
                    'Someone since removed'
                ),
            className: 'os-admin-meta',
            card: 'hidden',
        },
    ];

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
                            className={cn(
                                buttonVariants({
                                    variant: 'outline',
                                    size: 'sm',
                                }),
                                'os-admin-fill-accent shell-press',
                            )}
                        >
                            View users
                        </Link>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowForm(true)}
                            className="os-admin-fill-primary shell-press"
                        >
                            Send invite
                        </Button>
                    </>
                }
            >
                <InviteDialog open={showForm} onOpenChange={setShowForm} />

                {invites.data.length === 0 ? (
                    <div className="os-admin-surface border">
                        <EmptyState
                            icon={MailPlus}
                            title="No invitations yet"
                            body="Invite someone and they'll get a link to join this home."
                            action={
                                <Button
                                    type="button"
                                    onClick={() => setShowForm(true)}
                                    className="os-admin-fill-primary shell-press"
                                >
                                    Send your first invite
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <AdminCollection
                        columns={columns}
                        rows={invites.data}
                        rowKey={(invite) => invite.id}
                        actions={{
                            cell: (invite) => renderActions(invite),
                            cellClassName: 'text-right',
                            card: (invite) =>
                                inviteStatus(invite).label === 'Pending' && (
                                    <div className="mt-3">
                                        {renderActions(invite, true)}
                                    </div>
                                ),
                        }}
                        tableClassName="min-w-[720px]"
                        cardsAs="ul"
                    />
                )}

                <ConfirmDialog
                    open={asking === 'revoke'}
                    onOpenChange={(open) => !open && setAsking(null)}
                    title={`Revoke the invite for ${target?.email ?? 'this address'}?`}
                    description="The link will stop working right away."
                    confirmLabel="Revoke"
                    onConfirm={confirmRevoke}
                    variant="destructive"
                />

                <ConfirmDialog
                    open={asking === 'resend'}
                    onOpenChange={(open) => !open && setAsking(null)}
                    title={`Resend the invite to ${target?.email ?? 'this address'}?`}
                    description="The old link will stop working."
                    confirmLabel="Resend"
                    onConfirm={confirmResend}
                />

                <Pagination links={invites.links} />
            </Page>
        </>
    );
}

function Inviter({ person }: { person: Person }) {
    return (
        <span className="inline-flex items-center gap-1.5 align-middle">
            <PersonAvatar person={person} size={20} />
            {person.name}
        </span>
    );
}
