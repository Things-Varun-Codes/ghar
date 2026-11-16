import { useForm } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import { useDebouncedPreview } from '@/MiniApps/Corner/Hooks/useDebouncedPreview';
import { store, update } from '@/routes/apps/our-corner/movies';
import { preview as plexPreview } from '@/routes/apps/our-corner/plex';
import FormField from '@/Shell/Components/FormField';
import LoadingState from '@/Shell/Components/LoadingState';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const MovieIcon = entityIcon('corner.movie');

type MoviePreview = {
    title: string;
    year: number | null;
    poster_url: string | null;
    watch_url: string;
};

type MoviePreviewJson = {
    ok: boolean;
    title?: string;
    year?: number | null;
    poster_url?: string | null;
    watch_url?: string;
};

const NOT_FOUND_MESSAGE = "Couldn't find that on Plex. Add the title yourself.";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: { id: number; title: string; plex_url: string | null };
};

type FormShape = { title: string; plex_url: string };

export default function MovieAddDialog({ open, onOpenChange, item }: Props) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>({
        title: item?.title ?? '',
        plex_url: item?.plex_url ?? '',
    });
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const [linkInput, setLinkInput] = useState(item?.plex_url ?? '');
    const [plexOpen, setPlexOpen] = useState(Boolean(item?.plex_url));
    const plexRegionId = useId();
    const [previewImageBroken, setPreviewImageBroken] = useState(false);
    const {
        preview,
        trigger,
        cancel: cancelPreview,
        clear: clearPreview,
    } = useDebouncedPreview<MoviePreviewJson, MoviePreview>({
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

            setData('plex_url', json.watch_url ?? '');
        },
        noMatchMessage: NOT_FOUND_MESSAGE,
        failureMessage: NOT_FOUND_MESSAGE,
        report: {
            component: 'Corner/MovieAddDialog',
            action: 'plex.preview',
            tag: 'corner.movie-add',
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
    const showPlex = plexOpen || Boolean(errors.plex_url);

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
            post(store.url(), options);
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
                    setPlexOpen(Boolean(item?.plex_url));
                    clearPreview();
                    setPreviewImageBroken(false);
                }

                onOpenChange(next);
            }}
            title={isEdit ? 'Edit movie' : 'Add a movie'}
            submitLabel={isEdit ? 'Save changes' : 'Add movie'}
            busyText={isEdit ? 'Saving…' : 'Adding movie…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={isDirty}
            renderFields={() => (
                <>
                    <FormField
                        label="Movie title"
                        name="title"
                        error={errors.title}
                    >
                        <Input
                            id="title"
                            type="text"
                            placeholder="e.g. Inception"
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
                            error={errors.plex_url}
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
                                aria-label="Movie preview"
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
                                        <MovieIcon
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
                </>
            )}
        />
    );
}
