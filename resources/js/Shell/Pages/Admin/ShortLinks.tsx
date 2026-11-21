import { router, useForm } from '@inertiajs/react';
import { Link2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { formSubmitOptions, mutationOptions } from '@/lib/mutation';
import * as shortlinksRoutes from '@/routes/admin/shortlinks';
import AdminCollection from '@/Shell/Components/AdminCollection';
import type { AdminColumn } from '@/Shell/Components/AdminCollection';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
import EmptyState from '@/Shell/Components/EmptyState';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';

interface ShortLink {
    id: number;
    label: string;
    code: string;
    url: string;
    destination: string;
    enabled: boolean;
    created_at: string;
}

interface Props {
    shortlinks: ShortLink[];
}

const FIELDS = new Set(['label', 'destination']);

/*
 * Keyed by the link's id: useForm seeds from props on mount only, so a second row's dialog
 * would otherwise open with the first row's values.
 */
function EditShortLinkDialog({
    shortlink,
    open,
    onClose,
}: {
    shortlink: ShortLink;
    open: boolean;
    onClose: () => void;
}) {
    const form = useForm({
        label: shortlink.label,
        destination: shortlink.destination,
    });
    const { data, setData, patch, processing, errors, reset } = form;

    const gate = useDraftCloseGate({
        open,
        isDirty: form.isDirty,
        onClose,
        onDiscard: () => reset(),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(shortlinksRoutes.update.url({ shortlink: shortlink.id }), {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Admin/ShortLinks',
                action: 'shortlinks.update',
                isShownField: (key) => FIELDS.has(key),
                onSuccess: () => {
                    form.setDefaults();
                    onClose();
                },
            }),
        });
    };

    return (
        <Dialog open={open} onOpenChange={gate.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-display text-(length:--text-title) font-semibold">
                        Edit shortlink
                    </DialogTitle>
                    <DialogDescription>
                        Change where this tag sends people. The short URL below
                        stays the same.
                    </DialogDescription>
                </DialogHeader>
                <form
                    id="edit-shortlink-form"
                    onSubmit={submit}
                    className="flex flex-col gap-4"
                >
                    <div>
                        <p className="os-admin-meta">Short URL:</p>
                        <p className="os-admin-strong break-all">
                            {shortlink.url}
                        </p>
                    </div>
                    <FormField
                        label="Label"
                        name="edit-shortlink-label"
                        error={errors.label}
                    >
                        <Input
                            id="edit-shortlink-label"
                            type="text"
                            value={data.label}
                            onChange={(e) => setData('label', e.target.value)}
                            className="os-admin-control"
                            required
                        />
                    </FormField>
                    <FormField
                        label="Destination"
                        name="edit-shortlink-destination"
                        error={errors.destination}
                    >
                        <Input
                            id="edit-shortlink-destination"
                            type="url"
                            value={data.destination}
                            onChange={(e) =>
                                setData('destination', e.target.value)
                            }
                            className="os-admin-control"
                            required
                        />
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
                        form="edit-shortlink-form"
                        processing={processing}
                        busyText="Saving…"
                        className="os-admin-fill-primary os-admin-submit shell-press px-5"
                    >
                        Save
                    </SubmitButton>
                </DialogFooter>
                <DiscardDraftDialog
                    {...gate.prompt}
                    title="Discard your changes?"
                    description="The label and destination go back to what they were."
                />
            </DialogContent>
        </Dialog>
    );
}

export default function ShortLinks({ shortlinks }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        label: '',
        destination: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(
            shortlinksRoutes.store.url(),
            formSubmitOptions({
                component: 'Admin/ShortLinks',
                action: 'shortlinks.store',
                isShownField: (key) => FIELDS.has(key),
                onSuccess: () => reset(),
            }),
        );
    };

    // Each target stays after its dialog closes, so nothing empties while it fades out.
    const [deleting, setDeleting] = useState<ShortLink | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [editing, setEditing] = useState<ShortLink | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = (shortlink: ShortLink) => {
        setDeleting(shortlink);
        setConfirmOpen(true);
    };

    const handleEdit = (shortlink: ShortLink) => {
        setEditing(shortlink);
        setEditOpen(true);
    };

    const confirmDelete = () => {
        if (deleting) {
            router.delete(
                shortlinksRoutes.destroy.url({ shortlink: deleting.id }),
            );
        }
    };

    const [toggling, setToggling] = useState<Set<number>>(new Set());

    const toggleEnabled = (shortlink: ShortLink) => {
        if (toggling.has(shortlink.id)) {
            return;
        }

        router.patch(
            shortlinksRoutes.update.url({ shortlink: shortlink.id }),
            { enabled: !shortlink.enabled },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Admin/ShortLinks',
                    action: 'toggleEnabled',
                    onPendingChange: (pending) =>
                        setToggling((current) => {
                            const next = new Set(current);

                            if (pending) {
                                next.add(shortlink.id);
                            } else {
                                next.delete(shortlink.id);
                            }

                            return next;
                        }),
                }),
            },
        );
    };

    const renderSwitch = (shortlink: ShortLink) => (
        <Switch
            checked={shortlink.enabled}
            disabled={toggling.has(shortlink.id)}
            onCheckedChange={() => toggleEnabled(shortlink)}
            aria-label={`${shortlink.label} enabled`}
        />
    );

    const copyUrl = async (url: string) => {
        if (!navigator.clipboard) {
            toast.error(
                "This browser can't copy from here. Copy the link by hand.",
            );

            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success('Copied.');
            // eslint-disable-next-line local/no-silent-error -- clipboard write failure surfaces via the toast below; not actionable in the error tracker
        } catch {
            toast.error("Couldn't copy the shortlink. Try again.");
        }
    };

    const renderUrlCell = (shortlink: ShortLink) => (
        <div className="flex items-center gap-2">
            {/* Path only, in full: the code is the identifying part and
                must never truncate. Copy still copies the absolute URL. */}
            <span className="os-admin-strong whitespace-nowrap">
                {new URL(shortlink.url).pathname}
            </span>
            <Button
                type="button"
                variant="outline"
                onClick={() => copyUrl(shortlink.url)}
                aria-label={`Copy the ${shortlink.label} link`}
                className="os-admin-row-action os-admin-fill-accent shell-press shrink-0"
            >
                Copy
            </Button>
        </div>
    );

    const renderActions = (shortlink: ShortLink) => (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="outline"
                onClick={() => handleEdit(shortlink)}
                aria-label={`Edit ${shortlink.label}`}
                className="os-admin-row-action os-admin-fill-accent shell-press"
            >
                Edit
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleDelete(shortlink)}
                aria-label={`Delete ${shortlink.label}`}
                className="os-admin-row-action os-admin-outline-destructive shell-press"
            >
                Delete
            </Button>
        </div>
    );

    const columns: AdminColumn<ShortLink>[] = [
        {
            header: 'Label',
            cell: (shortlink) => shortlink.label,
            className: 'os-admin-strong',
            card: { as: 'title' },
        },
        {
            header: 'Short URL',
            cell: renderUrlCell,
            card: { as: 'block', className: 'mb-3' },
        },
        {
            header: 'Destination',
            cell: (shortlink) => shortlink.destination,
            className: 'os-admin-muted max-w-[320px] truncate',
            tooltip: (shortlink) => shortlink.destination,
            card: { as: 'subtitle', className: 'mt-1 truncate' },
        },
        {
            header: 'Enabled',
            cell: renderSwitch,
            card: { as: 'row', className: 'mb-3' },
        },
    ];

    return (
        <>
            <Page title="Shortlinks" room="Admin" backChevron>
                <div className="os-admin-surface mb-6 border p-6">
                    <h2 className="os-admin-section-title mb-4">
                        Create shortlink
                    </h2>
                    <form
                        onSubmit={submit}
                        className="flex flex-wrap items-end gap-3"
                    >
                        <FormField
                            label="Label"
                            name="shortlink-label"
                            error={errors.label}
                            className="min-w-[200px] flex-1"
                        >
                            <Input
                                id="shortlink-label"
                                type="text"
                                value={data.label}
                                onChange={(e) =>
                                    setData('label', e.target.value)
                                }
                                placeholder="e.g. Keychain NFC tag"
                                className="os-admin-control"
                                required
                            />
                        </FormField>
                        <FormField
                            label="Destination"
                            name="shortlink-destination"
                            error={errors.destination}
                            className="min-w-[280px] flex-1"
                        >
                            <Input
                                id="shortlink-destination"
                                type="url"
                                value={data.destination}
                                onChange={(e) =>
                                    setData('destination', e.target.value)
                                }
                                placeholder="https://example.com/page"
                                className="os-admin-control"
                                required
                            />
                        </FormField>
                        <SubmitButton
                            processing={processing}
                            busyText="Creating…"
                            className="os-admin-fill-primary os-admin-submit shell-press px-5"
                        >
                            Create shortlink
                        </SubmitButton>
                    </form>
                </div>

                {shortlinks.length === 0 ? (
                    <EmptyState
                        icon={Link2}
                        title="No shortlinks yet"
                        body="Create a shortlink above to point an NFC tag somewhere private."
                    />
                ) : (
                    <AdminCollection
                        columns={columns}
                        rows={shortlinks}
                        rowKey={(shortlink) => shortlink.id}
                        actions={{
                            cell: (shortlink) => (
                                <div className="flex justify-end">
                                    {renderActions(shortlink)}
                                </div>
                            ),
                            card: renderActions,
                        }}
                        tableClassName="min-w-[760px]"
                    />
                )}

                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title={`Delete ${deleting?.label ?? 'this shortlink'}?`}
                    description="There's no undo. The tag stops working right away."
                    confirmLabel="Delete"
                    variant="destructive"
                    onConfirm={confirmDelete}
                />

                {editing && (
                    <EditShortLinkDialog
                        key={editing.id}
                        shortlink={editing}
                        open={editOpen}
                        onClose={() => setEditOpen(false)}
                    />
                )}
            </Page>
        </>
    );
}
