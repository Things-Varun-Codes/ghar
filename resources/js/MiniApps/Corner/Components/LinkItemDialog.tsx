import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import type { ItemDialogProps } from '@/MiniApps/Corner/Components/ItemDialog';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { useDebouncedPreview } from '@/MiniApps/Corner/Hooks/useDebouncedPreview';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
import { store, update } from '@/routes/apps/our-corner/items';
import { preview as oembedPreview } from '@/routes/apps/our-corner/oembed';
import FormField from '@/Shell/Components/FormField';
import LoadingState from '@/Shell/Components/LoadingState';

type LinkPreview = {
    provider: string;
    title: string;
    author: string | null;
    thumbnail_url: string | null;
};

type LinkPreviewJson = {
    ok: boolean;
    provider?: string;
    title?: string;
    author?: string | null;
    thumbnail_url?: string | null;
};

type FormShape = { url: string; title: string; notes: string };

export default function LinkItemDialog({
    list,
    open,
    onOpenChange,
    item,
}: ItemDialogProps) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>({
        url: item?.url ?? '',
        title: item?.title ?? '',
        notes: item?.notes ?? '',
    });
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const [previewImageBroken, setPreviewImageBroken] = useState(false);
    const {
        preview,
        trigger,
        cancel: cancelPreview,
        clear: clearPreview,
    } = useDebouncedPreview<LinkPreviewJson, LinkPreview>({
        endpoint: oembedPreview.url(),
        parse: (json, url) => ({
            provider: json.provider ?? 'unknown',
            title: json.title ?? url,
            author: json.author ?? null,
            thumbnail_url: json.thumbnail_url ?? null,
        }),
        noMatchMessage:
            "No preview for that link. It'll save with the name you give it.",
        failureMessage:
            "Couldn't load the preview. It'll save with just the link.",
        report: {
            component: 'Corner/LinkItemDialog',
            action: 'oembed.preview',
            tag: 'corner.link-add',
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
            post(store.url(list.slug), options);
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
            title={isEdit ? 'Edit' : `Add to ${list.name}`}
            submitLabel={isEdit ? 'Save changes' : 'Add'}
            busyText={isEdit ? 'Saving…' : 'Adding…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={isDirty}
            renderFields={() => (
                <>
                    <FormField label="Link" name="url" error={errors.url}>
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
                            className="text-(length:--text-body)"
                        />
                    </FormField>

                    {preview.kind === 'loading' && (
                        <LoadingState rows={1} variant="card" />
                    )}

                    {preview.kind === 'ok' && (
                        <div
                            role="region"
                            aria-label="Link preview"
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
                                {preview.author && (
                                    <p className="corner-preview-meta">
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
                            className="m-0 text-(length:--text-small) text-(--corner-ink-soft)"
                        >
                            {preview.message}
                        </p>
                    )}

                    <FormField
                        label="Name (optional)"
                        name="title"
                        error={errors.title}
                    >
                        <Input
                            id="title"
                            type="text"
                            autoComplete="off"
                            maxLength={255}
                            placeholder={
                                preview.kind === 'ok'
                                    ? preview.title
                                    : 'What the link says it is'
                            }
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="text-(length:--text-body)"
                        />
                    </FormField>

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
