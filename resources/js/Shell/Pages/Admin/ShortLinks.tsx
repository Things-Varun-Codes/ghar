import { Head, router, useForm } from '@inertiajs/react';
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
import { cn } from '@/lib/utils';
import * as shortlinksRoutes from '@/routes/admin/shortlinks';
import EmptyState from '@/Shell/Components/EmptyState';
import FormField from '@/Shell/Components/FormField';
import Page from '@/Shell/Components/Page';
import SubmitButton from '@/Shell/Components/SubmitButton';
import AppLayout from '@/Shell/Layouts/AppLayout';

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
                <p className="os-admin-meta">
                    Short URL (never changes, even after repointing):
                </p>
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
                        'os-admin-control block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
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
                        'os-admin-control block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
                        errors.destination && 'os-admin-control--invalid',
                    )}
                    required
                />
            </FormField>
            <div className="flex items-center gap-3">
                <SubmitButton
                    processing={processing}
                    busyText="Saving…"
                    className="os-admin-tap os-admin-fill-primary os-admin-submit rounded-lg px-5 font-semibold"
                >
                    Save
                </SubmitButton>
                <button
                    type="button"
                    onClick={onDone}
                    className="os-admin-tap os-admin-tap-center os-admin-cancel-link rounded-lg px-5 font-medium transition-colors"
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

    const toggleEnabled = (shortlink: ShortLink) => {
        router.patch(
            shortlinksRoutes.update.url({ shortlink: shortlink.id }),
            { enabled: !shortlink.enabled },
            { preserveScroll: true },
        );
    };

    const copyUrl = async (url: string) => {
        if (!navigator.clipboard) {
            toast.error('Copy is unavailable in this context.');

            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success('Copied.');
            // eslint-disable-next-line local/no-silent-error -- clipboard write failure surfaces via the toast below; not actionable in the error tracker
        } catch {
            toast.error('Could not copy the shortlink.');
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
                className="os-admin-row-action os-admin-fill-accent inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors hover:opacity-80"
            >
                Copy
            </button>
        </div>
    );

    const renderActions = (shortlink: ShortLink) => (
        <div className="flex items-center justify-end gap-2">
            <button
                type="button"
                onClick={() => setEditing(shortlink)}
                className="os-admin-row-action os-admin-fill-accent inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:opacity-80"
            >
                Edit
            </button>
            <button
                type="button"
                onClick={() => handleDelete(shortlink)}
                className="os-admin-row-action os-admin-outline-destructive inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:opacity-80"
            >
                Delete
            </button>
        </div>
    );

    return (
        <AppLayout>
            <Head title="Shortlinks — Admin" />

            <Page tier="index" title="Shortlinks" backChevron>
                <div className="os-admin-surface mb-6 rounded-xl border p-6">
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
                                    'os-admin-control block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
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
                                placeholder="https://…"
                                className={cn(
                                    'os-admin-control block w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-offset-1',
                                    errors.destination &&
                                        'os-admin-control--invalid',
                                )}
                                required
                            />
                        </FormField>
                        <SubmitButton
                            processing={processing}
                            busyText="Creating…"
                            className="os-admin-tap os-admin-fill-primary os-admin-submit rounded-lg px-5 font-semibold"
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
                    <>
                        <div className="os-admin-surface hidden overflow-x-auto rounded-xl border sm:block">
                            <Table className="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Short URL</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Enabled</TableHead>
                                        <TableHead className="text-right">
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
                                                <Switch
                                                    checked={shortlink.enabled}
                                                    onCheckedChange={() =>
                                                        toggleEnabled(shortlink)
                                                    }
                                                    aria-label={`Toggle ${shortlink.label} enabled`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {renderActions(shortlink)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-col gap-3 sm:hidden">
                            {shortlinks.map((shortlink) => (
                                <div
                                    key={shortlink.id}
                                    className="os-admin-surface rounded-xl border p-4"
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
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="os-admin-meta">
                                            Enabled
                                        </span>
                                        <Switch
                                            checked={shortlink.enabled}
                                            onCheckedChange={() =>
                                                toggleEnabled(shortlink)
                                            }
                                            aria-label={`Toggle ${shortlink.label} enabled`}
                                        />
                                    </div>
                                    {renderActions(shortlink)}
                                </div>
                            ))}
                        </div>
                    </>
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
                    useThemeAttrs() internally — do not hand-spread it here. */}
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
                                Repoint where this tag sends people. The short
                                URL below never changes.
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
        </AppLayout>
    );
}
