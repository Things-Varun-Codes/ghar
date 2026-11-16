import { useForm } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import type { ItemDialogProps } from '@/MiniApps/Corner/Components/ItemDialog';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { useDebouncedPreview } from '@/MiniApps/Corner/Hooks/useDebouncedPreview';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
import { store, update } from '@/routes/apps/our-corner/items';
import { preview as plexPreview } from '@/routes/apps/our-corner/plex';
import FormField from '@/Shell/Components/FormField';
import LoadingState from '@/Shell/Components/LoadingState';

type PosterPreview = {
    title: string;
    year: number | null;
    poster_url: string | null;
    watch_url: string;
};

type PosterPreviewJson = {
    ok: boolean;
    title?: string;
    year?: number | null;
    poster_url?: string | null;
    watch_url?: string;
};

const NOT_FOUND_MESSAGE = "Couldn't find that on Plex. Add the title yourself.";

type FormShape = { title: string; url: string; notes: string };

export default function PosterItemDialog({
    list,
    open,
    onOpenChange,
    item,
}: ItemDialogProps) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>({
        title: item?.title ?? '',
        url: item?.url ?? '',
        notes: item?.notes ?? '',
    });
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const [linkInput, setLinkInput] = useState(item?.url ?? '');
    const [plexOpen, setPlexOpen] = useState(Boolean(item?.url));
    const plexRegionId = useId();
    const [previewImageBroken, setPreviewImageBroken] = useState(false);
    const {
        preview,
        trigger,
        cancel: cancelPreview,
        clear: clearPreview,
    } = useDebouncedPreview<PosterPreviewJson, PosterPreview>({
        endpoint: plexPreview.url(),
        parse: (json, url) => ({
            title: json.title ?? '',
            year: json.year ?? null,
            poster_url: json.poster_url ?? null,
            watch_url: json.watch_url ?? url,
        }),
        // Plex fills the title only when it's still empty: what was typed wins.
        onResult: (json) => {
            if (data.title.trim() === '') {
                setData('title', json.title ?? '');
            }

            setData('url', json.watch_url ?? '');
        },
        noMatchMessage: NOT_FOUND_MESSAGE,
        failureMessage: NOT_FOUND_MESSAGE,
        report: {
            component: 'Corner/PosterItemDialog',
            action: 'plex.preview',
            tag: 'corner.poster-add',
        },
    });

    const triggerPreview = (url: string) => {
        setPreviewImageBroken(false);
        trigger(url);
    };

    const handleLinkChange = (next: string) => {
        setLinkInput(next);
        triggerPreview(next);
    };

    // A Plex error must never sit inside a collapsed section.
    const showPlex = plexOpen || Boolean(errors.url);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                gateReset();
                setLinkInput('');
                setPlexOpen(false);
                clearPreview();
                setPreviewImageBroken(false);
                onOpenChange(false);
            },
        };

        if (isEdit) {
            // An edit doesn't move the list's reset key, so force a remount or the row stays stale.
            patch(update.url(item.id), {
                ...options,
                preserveState: false,
            });
        } else {
            post(store.url(list.slug), options);
        }
    };

    return (
        <ListAddDialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    cancelPreview();
                }

                if (!next && !isDirty) {
                    setLinkInput('');
                    setPlexOpen(Boolean(item?.url));
                    clearPreview();
                    setPreviewImageBroken(false);
                }

                onOpenChange(next);
            }}
            title={isEdit ? 'Edit' : `Add to ${list.name}`}
            submitLabel={isEdit ? 'Save changes' : 'Add'}
            busyText={isEdit ? 'Saving…' : 'Adding…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={isDirty}
            renderFields={() => (
                <>
                    <FormField label="Title" name="title" error={errors.title}>
                        <Input
                            id="title"
                            type="text"
                            autoComplete="off"
                            autoFocus
                            maxLength={255}
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="text-(length:--text-body)"
                        />
                    </FormField>

                    <button
                        type="button"
                        className="corner-disclosure"
                        aria-expanded={showPlex}
                        aria-controls={plexRegionId}
                        onClick={() => setPlexOpen(!showPlex)}
                    >
                        <ChevronDown
                            aria-hidden="true"
                            size={16}
                            strokeWidth={1.5}
                            className="corner-disclosure-icon"
                        />
                        Plex link (optional)
                    </button>

                    <div
                        id={plexRegionId}
                        hidden={!showPlex}
                        className="flex flex-col gap-4"
                    >
                        <FormField
                            label="Plex link"
                            name="plex_link"
                            error={errors.url}
                        >
                            <Input
                                id="plex_link"
                                type="url"
                                inputMode="url"
                                placeholder="Paste a Plex share link…"
                                autoComplete="off"
                                maxLength={2048}
                                value={linkInput}
                                onChange={(e) =>
                                    handleLinkChange(e.target.value)
                                }
                                onBlur={(e) => triggerPreview(e.target.value)}
                                onPaste={(e) => {
                                    const pasted =
                                        e.clipboardData.getData('text');

                                    if (pasted) {
                                        triggerPreview(pasted);
                                    }
                                }}
                                className="text-(length:--text-body)"
                            />
                        </FormField>

                        {preview.kind === 'loading' && (
                            <LoadingState rows={1} variant="card" />
                        )}

                        {preview.kind === 'ok' && (
                            <div
                                role="region"
                                aria-label="Plex preview"
                                className="corner-preview-card"
                            >
                                {preview.poster_url && !previewImageBroken ? (
                                    <img
                                        src={preview.poster_url}
                                        alt=""
                                        width={88}
                                        height={66}
                                        onError={() =>
                                            setPreviewImageBroken(true)
                                        }
                                        className="corner-preview-thumb"
                                    />
                                ) : (
                                    <div
                                        aria-hidden="true"
                                        className="corner-preview-placeholder"
                                    >
                                        <ListIcon
                                            name={list.icon}
                                            size={32}
                                            strokeWidth={1.5}
                                            aria-hidden="true"
                                            className="text-(--corner-accent-text)"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="corner-preview-title">
                                        {preview.title}
                                    </p>
                                    {preview.year !== null && (
                                        <p className="corner-preview-meta">
                                            {preview.year}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {preview.kind === 'error' && (
                            <p
                                role="alert"
                                className="m-0 text-(length:--text-small) text-(--corner-ink-soft)"
                            >
                                {preview.message}
                            </p>
                        )}
                    </div>

                    <NotesField
                        value={data.notes}
                        onChange={(v) => setData('notes', v)}
                        error={errors.notes}
                    />
                </>
            )}
        />
    );
}
