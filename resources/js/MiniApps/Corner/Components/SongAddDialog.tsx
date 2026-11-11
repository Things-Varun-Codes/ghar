import { useForm } from '@inertiajs/react';
import { Music } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import { useDebouncedPreview } from '@/MiniApps/Corner/Hooks/useDebouncedPreview';
import { preview as oembedPreview } from '@/routes/apps/our-corner/oembed';
import { store, update } from '@/routes/apps/our-corner/songs';
import FormField from '@/Shell/Components/FormField';
import LoadingState from '@/Shell/Components/LoadingState';

type SongPreview = {
    provider: string;
    title: string;
    author: string | null;
    thumbnail_url: string | null;
};

type SongPreviewJson = {
    ok: boolean;
    provider?: string;
    title?: string;
    author?: string | null;
    thumbnail_url?: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: { id: number; url: string };
};

type FormShape = { url: string };

export default function SongAddDialog({ open, onOpenChange, item }: Props) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>({ url: item?.url ?? '' });
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const [previewImageBroken, setPreviewImageBroken] = useState(false);
    const {
        preview,
        trigger,
        cancel: cancelPreview,
        clear: clearPreview,
    } = useDebouncedPreview<SongPreviewJson, SongPreview>({
        endpoint: oembedPreview.url(),
        parse: (json, url) => ({
            provider: json.provider ?? 'unknown',
            title: json.title ?? url,
            author: json.author ?? null,
            thumbnail_url: json.thumbnail_url ?? null,
        }),
        noMatchMessage: "That doesn't look like a YouTube or Spotify link.",
        failureMessage:
            "Couldn't load the preview. It'll save with just the link.",
        report: {
            component: 'Corner/SongAddDialog',
            action: 'oembed.preview',
            tag: 'corner.song-add',
        },
    });

    const triggerPreview = (url: string) => {
        setPreviewImageBroken(false);
        trigger(url);
    };

    const handleUrlChange = (next: string) => {
        setData('url', next);
        triggerPreview(next);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                gateReset();
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

                    if (!isDirty) {
                        clearPreview();
                        setPreviewImageBroken(false);
                    }
                }

                onOpenChange(next);
            }}
            title={isEdit ? 'Edit song' : 'Add a song'}
            submitLabel={isEdit ? 'Save changes' : 'Add song'}
            busyText={isEdit ? 'Saving…' : 'Adding song…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={() => isDirty}
            renderFields={() => (
                <>
                    <FormField
                        label="YouTube or Spotify link"
                        name="url"
                        error={errors.url}
                    >
                        <Input
                            id="url"
                            type="url"
                            inputMode="url"
                            placeholder="https://..."
                            autoComplete="off"
                            value={data.url}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            onBlur={(e) => triggerPreview(e.target.value)}
                            onPaste={(e) => {
                                const pasted = e.clipboardData.getData('text');

                                if (pasted) {
                                    triggerPreview(pasted);
                                }
                            }}
                            className="text-[16px]"
                        />
                    </FormField>

                    {preview.kind === 'loading' && (
                        <LoadingState rows={1} variant="card" />
                    )}

                    {preview.kind === 'ok' && (
                        <div
                            role="region"
                            aria-label="Song preview"
                            className="corner-preview-card"
                        >
                            {preview.thumbnail_url && !previewImageBroken ? (
                                <img
                                    src={preview.thumbnail_url}
                                    alt=""
                                    width={88}
                                    height={66}
                                    onError={() => setPreviewImageBroken(true)}
                                    className="corner-preview-thumb"
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    className="corner-preview-placeholder"
                                >
                                    <Music
                                        size={32}
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                        className="text-(--corner-accent)"
                                    />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="corner-preview-title">
                                    {preview.title}
                                </p>
                                {preview.author && (
                                    <p className="mx-0 mt-1 mb-0 text-[13px] text-(--corner-ink-soft)">
                                        {preview.author}
                                    </p>
                                )}
                                <p className="corner-preview-provider">
                                    {preview.provider}
                                </p>
                            </div>
                        </div>
                    )}

                    {preview.kind === 'error' && (
                        <p
                            role="alert"
                            className="m-0 text-[13px] text-(--corner-ink-soft)"
                        >
                            {preview.message}
                        </p>
                    )}
                </>
            )}
        />
    );
}
