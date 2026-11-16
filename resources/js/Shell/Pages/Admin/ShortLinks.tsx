import { router, useForm } from '@inertiajs/react';
import { Link2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEventHandler } from 'react';
import { toast } from 'sonner';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { mutationOptions } from '@/lib/mutation';
import { cn } from '@/lib/utils';
import * as shortlinksRoutes from '@/routes/admin/shortlinks';
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

function EditShortLinkForm({
    shortlink,
    onDone,
}: {
    shortlink: ShortLink;
    onDone: () => void;
}) {
    const { data, setData, patch, processing, errors } = useForm({
        label: shortlink.label,
        destination: shortlink.destination,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(shortlinksRoutes.update.url({ shortlink: shortlink.id }), {
            preserveScroll: true,
            onSuccess: () => onDone(),
        });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
                <p className="os-admin-meta">Short URL:</p>
                <p className="os-admin-strong break-all">{shortlink.url}</p>
            </div>
            <FormField
                label="Label"
                name="edit-shortlink-label"
                error={errors.label}
            >
                <input
                    id="edit-shortlink-label"
                    type="text"
                    value={data.label}
                    onChange={(e) => setData('label', e.target.value)}
                    className={cn(
                        'os-admin-control shell-field block w-full border px-3 py-2.5 outline-none',
                        errors.label && 'os-admin-control--invalid',
                    )}
                    required
                />
            </FormField>
            <FormField
                label="Destination"
                name="edit-shortlink-destination"
                error={errors.destination}
            >
                <input
                    id="edit-shortlink-destination"
                    type="url"
                    value={data.destination}
                    onChange={(e) => setData('destination', e.target.value)}
                    className={cn(
                        'os-admin-control shell-field block w-full border px-3 py-2.5 outline-none',
                        errors.destination && 'os-admin-control--invalid',
                    )}
                    required
                />
            </FormField>
            <div className="flex items-center gap-3">
                <SubmitButton
                    processing={processing}
                    busyText="Saving…"
                    className="os-admin-tap os-admin-fill-primary os-admin-submit shell-press px-5 font-medium"
                >
                    Save
                </SubmitButton>
                <button
                    type="button"
                    onClick={onDone}
                    className="os-admin-tap os-admin-tap-center os-admin-cancel-link shell-press px-5 font-medium"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function ShortLinks({ shortlinks }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        label: '',
        destination: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(shortlinksRoutes.store.url(), {
            onSuccess: () => reset(),
        });
    };

    const [pendingDelete, setPendingDelete] = useState<ShortLink | null>(null);

    const [editing, setEditing] = useState<ShortLink | null>(null);

    const handleDelete = (shortlink: ShortLink) => {
        setPendingDelete(shortlink);
    };

    const confirmDelete = () => {
        if (!pendingDelete) {
            return;
        }

        const shortlink = pendingDelete;
        setPendingDelete(null);
        router.delete(
            shortlinksRoutes.destroy.url({ shortlink: shortlink.id }),
        );
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
            <button
                type="button"
                onClick={() => copyUrl(shortlink.url)}
                aria-label={`Copy the ${shortlink.label} link`}
                className="os-admin-row-action os-admin-fill-accent shell-press inline-flex shrink-0 items-center justify-center"
            >
                Copy
            </button>
        </div>
    );

    const renderActions = (shortlink: ShortLink) => (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setEditing(shortlink)}
                aria-label={`Edit ${shortlink.label}`}
                className="os-admin-row-action os-admin-fill-accent shell-press inline-flex items-center justify-center"
            >
                Edit
            </button>
            <button
                type="button"
                onClick={() => handleDelete(shortlink)}
                aria-label={`Delete ${shortlink.label}`}
                className="os-admin-row-action os-admin-outline-destructive shell-press inline-flex items-center justify-center"
            >
                Delete
            </button>
        </div>
    );

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
                            <input
                                id="shortlink-label"
                                type="text"
                                value={data.label}
                                onChange={(e) =>
                                    setData('label', e.target.value)
                                }
                                placeholder="e.g. Keychain NFC tag"
                                className={cn(
                                    'os-admin-control shell-field block w-full border px-3 py-2.5 outline-none',
                                    errors.label && 'os-admin-control--invalid',
                                )}
                                required
                            />
                        </FormField>
                        <FormField
                            label="Destination"
                            name="shortlink-destination"
                            error={errors.destination}
                            className="min-w-[280px] flex-1"
                        >
                            <input
                                id="shortlink-destination"
                                type="url"
                                value={data.destination}
                                onChange={(e) =>
                                    setData('destination', e.target.value)
                                }
                                placeholder="https://example.com/page"
                                className={cn(
                                    'os-admin-control shell-field block w-full border px-3 py-2.5 outline-none',
                                    errors.destination &&
                                        'os-admin-control--invalid',
                                )}
                                required
                            />
                        </FormField>
                        <SubmitButton
                            processing={processing}
                            busyText="Creating…"
                            className="os-admin-tap os-admin-fill-primary os-admin-submit shell-press px-5 font-medium"
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
                    <div className="@container">
                        <div className="os-admin-surface hidden overflow-x-auto border @min-[760px]:block">
                            <Table className="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Short URL</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Enabled</TableHead>
                                        <TableHead className="os-admin-sticky-actions text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shortlinks.map((shortlink) => (
                                        <TableRow key={shortlink.id}>
                                            <TableCell className="os-admin-strong">
                                                {shortlink.label}
                                            </TableCell>
                                            <TableCell>
                                                {renderUrlCell(shortlink)}
                                            </TableCell>
                                            <TableCell
                                                className="os-admin-muted max-w-[320px] truncate"
                                                title={shortlink.destination}
                                            >
                                                {shortlink.destination}
                                            </TableCell>
                                            <TableCell>
                                                {renderSwitch(shortlink)}
                                            </TableCell>
                                            <TableCell className="os-admin-sticky-actions">
                                                <div className="flex justify-end">
                                                    {renderActions(shortlink)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-col gap-3 @min-[760px]:hidden">
                            {shortlinks.map((shortlink) => (
                                <div
                                    key={shortlink.id}
                                    className="os-admin-surface border p-4"
                                >
                                    <div className="mb-3">
                                        <p className="os-admin-strong">
                                            {shortlink.label}
                                        </p>
                                        <p
                                            className="os-admin-meta mt-1 truncate"
                                            title={shortlink.destination}
                                        >
                                            {shortlink.destination}
                                        </p>
                                    </div>
                                    <div className="mb-3">
                                        {renderUrlCell(shortlink)}
                                    </div>
                                    <div className="mb-3 flex min-h-11 items-center justify-between">
                                        <span className="os-admin-meta">
                                            Enabled
                                        </span>
                                        {renderSwitch(shortlink)}
                                    </div>
                                    {renderActions(shortlink)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                Delete {pendingDelete?.label}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                There's no undo. The tag stops working right
                                away.
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

                {/* Edit — repoint a shortlink's label/destination.
                    key={editing.id} is load-bearing: useForm
                    seeds from props on mount only, so without the key,
                    opening a second row's dialog would show the first
                    row's stale values. DialogContent already spreads
                    useAppAttrs() internally — do not hand-spread it here. */}
                <Dialog
                    open={editing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditing(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit shortlink</DialogTitle>
                            <DialogDescription>
                                Change where this tag sends people. The short
                                URL below stays the same.
                            </DialogDescription>
                        </DialogHeader>
                        {editing && (
                            <EditShortLinkForm
                                key={editing.id}
                                shortlink={editing}
                                onDone={() => setEditing(null)}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </Page>
        </>
    );
}
