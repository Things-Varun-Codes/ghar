import { HttpResponseError } from '@inertiajs/core';
import { http, router } from '@inertiajs/react';
import { X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Fade } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { mutationOptions } from '@/lib/mutation';
import { captureSilent } from '@/lib/observability';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { useComposeForm } from '@/MiniApps/Mailbox/Hooks/useComposeForm';
import { generate, store } from '@/routes/apps/our-exchange/postcards';
import * as prompts from '@/routes/apps/our-exchange/postcards/prompts';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';

type PostcardFormShape = {
    recipient_ids: number[];
    /* What the picture in `image` was made from; the box being typed in is `draft`. */
    prompt: string;
    note: string;
    image: string | null;
    mime: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    presets: Preset[];
    savedPrompts: SavedPrompt[];
    members: HouseholdMember[];
};

export type Preset = { key: string; name: string; prompt: string };
export type SavedPrompt = { id: number; name: string; prompt: string };

const PROMPT_MAX = 1000;
const NAME_MAX = 40;
const NOTE_MAX = 600;

/* An object URL, not a data: URI: ~1.4 MB of base64 in the DOM freezes iOS Safari scrolling. */
function base64ToObjectUrl(base64: string, mime: string): string | null {
    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return URL.createObjectURL(new Blob([bytes], { type: mime }));
        // eslint-disable-next-line local/no-silent-error -- malformed base64 → null; caller falls back to a data: URI
    } catch {
        return null;
    }
}

export default function PostcardSheet({
    open,
    onOpenChange,
    presets,
    savedPrompts,
    members,
}: Props) {
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Revoke the previous object URL whenever it changes, and on unmount — the
    // cleanup runs with the prior previewUrl value, so swapping/clearing/closing
    // never leaks a blob.
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const compose = useComposeForm<PostcardFormShape>({
        component: 'Mailbox/PostcardSheet',
        action: 'postcard.create',
        members,
        fields: {
            prompt: '',
            note: '',
            image: null,
            mime: '',
        },
        dirtyFields: ['note'],
        shownFields: ['note', 'prompt'],
        missing: (data) =>
            generating
                ? null
                : data.image === null || genError !== null
                  ? draft.trim() === ''
                      ? 'Say what the picture should show.'
                      : 'Make the picture first.'
                  : null,
    });
    const { data, setData, processing, errors } = compose.form;
    const isDirty =
        compose.isDirty || data.image !== null || draft.trim() !== '';

    const handleReset = () => {
        compose.reset();
        setDraft('');
        setNaming(false);
        setName('');
        setNameError(null);
        setGenerating(false);
        setGenError(null);
        setPreviewUrl(null); // effect cleanup revokes the prior blob URL
    };

    const generateDisabled = draft.trim() === '' || generating || processing;

    const handleGenerate = async () => {
        if (generateDisabled) {
            return;
        }

        setGenerating(true);
        setGenError(null);

        try {
            const res = await http.getClient().request({
                method: 'post',
                url: generate.url(),
                data: { prompt: draft.trim() },
                headers: { Accept: 'application/json' },
            });

            const json = JSON.parse(res.data) as {
                image: string;
                mime: string;
            };
            setData('prompt', draft.trim());
            setData('image', json.image);
            setData('mime', json.mime);
            setPreviewUrl(base64ToObjectUrl(json.image, json.mime));
        } catch (err) {
            if (err instanceof HttpResponseError) {
                let msg = 'Could not make your picture. Please try again.';

                // Only the 422s carry a message meant for the household; Laravel's own (419, 429…) don't.
                try {
                    const json = JSON.parse(err.response.data) as {
                        message?: string;
                    };

                    if (err.response.status === 422 && json.message) {
                        msg = json.message;
                    }
                    // eslint-disable-next-line local/no-silent-error -- JSON parse failure on error body; msg already set to fallback string
                } catch {
                    // intentionally silent — fallback msg already set
                }

                setGenError(msg);

                return;
            }

            setGenError('Could not make your picture. Please try again.');
            captureSilent(
                err instanceof Error
                    ? err
                    : new Error('postcard.generate failed'),
                {
                    component: 'Mailbox/PostcardSheet',
                    action: 'postcard.generate',
                    surface: 'frontend',
                },
            );
        } finally {
            setGenerating(false);
        }
    };

    const sendDisabled = processing || generating || compose.hint !== null;

    const handleSend = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (sendDisabled) {
            return;
        }

        compose.send(store.url(), {
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
        });
    };

    const handleSavePrompt = () => {
        if (saving) {
            return;
        }

        setNameError(null);
        router.post(
            prompts.store.url(),
            { name: name.trim(), prompt: draft.trim() },
            {
                preserveScroll: true,
                preserveState: true,
                ...mutationOptions({
                    component: 'Mailbox/PostcardSheet',
                    action: 'prompt.save',
                    onPendingChange: setSaving,
                }),
                onSuccess: () => {
                    setNaming(false);
                    setName('');
                },
                // eslint-disable-next-line local/no-silent-error -- a validation message, shown under the name field
                onError: (failed) =>
                    setNameError(failed.name ?? failed.prompt ?? null),
            },
        );
    };

    const handleRemovePrompt = (saved: SavedPrompt) => {
        router.delete(prompts.destroy.url(saved.id), {
            preserveScroll: true,
            preserveState: true,
            ...mutationOptions({
                component: 'Mailbox/PostcardSheet',
                action: 'prompt.remove',
            }),
        });
    };

    const busy = generating || processing;

    return (
        <FormSheet
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setGenError(null);
                }

                onOpenChange(next);
            }}
            title="Make a postcard"
            description="Describe a picture, make it and choose who it goes to."
            isDirty={isDirty}
            discardTitle="Discard this postcard?"
            discardDescription="Your prompt and picture will be lost."
            onDiscard={handleReset}
            onSubmit={handleSend}
            hint={compose.sheetHint}
            hintId={compose.hintId}
            width={640}
            footer={
                <SubmitButton
                    processing={processing}
                    disabled={sendDisabled}
                    busyText="Sending…"
                    aria-describedby={compose.describedBy}
                >
                    Send postcard
                </SubmitButton>
            }
        >
            <RecipientPicker
                members={members}
                value={data.recipient_ids}
                onChange={(ids) => setData('recipient_ids', ids)}
                errors={errors}
            />

            <div>
                <FormField
                    label="What should the picture show?"
                    name="postcard-prompt"
                    error={errors.prompt}
                    required
                    className="mailbox-form-field"
                >
                    <Textarea
                        id="postcard-prompt"
                        className="mailbox-postcard-prompt-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        maxLength={PROMPT_MAX}
                        disabled={busy}
                        placeholder="e.g. our dog as an astronaut, in watercolour"
                    />
                </FormField>
                <CharCount length={draft.length} max={PROMPT_MAX} />
            </div>

            <ul
                aria-label="Start from a prompt"
                className="m-0 flex list-none flex-wrap gap-2 p-0"
            >
                {presets.map((preset) => (
                    <li key={preset.key}>
                        <button
                            type="button"
                            className="mailbox-prompt-chip shell-press"
                            disabled={busy}
                            onClick={() => setDraft(preset.prompt)}
                        >
                            {preset.name}
                        </button>
                    </li>
                ))}
                {savedPrompts.map((saved) => (
                    <li
                        key={saved.id}
                        className="mailbox-prompt-chip mailbox-prompt-chip-saved"
                    >
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setDraft(saved.prompt)}
                        >
                            {saved.name}
                        </button>
                        <button
                            type="button"
                            aria-label={`Remove your saved prompt ${saved.name}`}
                            onClick={() => handleRemovePrompt(saved)}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>

            {naming ? (
                <FormField
                    label="Name this prompt"
                    name="postcard-prompt-name"
                    error={nameError ?? undefined}
                    className="mailbox-form-field"
                >
                    <div className="flex gap-2">
                        <Input
                            id="postcard-prompt-name"
                            type="text"
                            value={name}
                            maxLength={NAME_MAX}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                // Enter here saves the prompt rather than sending the postcard.
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSavePrompt();
                                }
                            }}
                            className="mailbox-postcard-prompt-input"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={saving || name.trim() === ''}
                            onClick={handleSavePrompt}
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setNaming(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </FormField>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <SubmitButton
                        type="button"
                        processing={generating}
                        disabled={generateDisabled}
                        busyText="Making your picture…"
                        onClick={handleGenerate}
                        variant="outline"
                    >
                        {data.image ? 'Make another' : 'Make the picture'}
                    </SubmitButton>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={draft.trim() === '' || busy}
                        onClick={() => setNaming(true)}
                    >
                        Save this prompt
                    </Button>
                </div>
            )}

            {(generating || data.image || genError) && (
                <div className="mailbox-postcard-stage">
                    {generating && (
                        <div
                            role="status"
                            aria-busy="true"
                            aria-label="Making your picture…"
                            className="h-full w-full"
                        >
                            <Skeleton className="h-full w-full" />
                        </div>
                    )}
                    <Fade
                        show={!generating && !genError && data.image !== null}
                        media
                        className="h-full w-full"
                    >
                        <img
                            src={
                                previewUrl ??
                                `data:${data.mime};base64,${data.image}`
                            }
                            alt={`Preview: ${data.prompt}`}
                            decoding="async"
                            className="block h-full w-full object-cover"
                        />
                    </Fade>
                    {!generating && genError && (
                        <div role="alert" className="p-4 text-center">
                            <p className="mx-0 mt-0 mb-2 text-(length:--text-small) text-(--mailbox-destructive)">
                                {genError}
                            </p>
                            <Button
                                type="button"
                                variant="link"
                                onClick={handleGenerate}
                                disabled={generateDisabled}
                                className="mailbox-link-retry"
                            >
                                Try again
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div>
                <FormField
                    label="Add a note (optional)"
                    name="postcard-note"
                    error={errors.note}
                    className="mailbox-form-field"
                >
                    <Textarea
                        id="postcard-note"
                        className="mailbox-hand mailbox-postcard-note-input"
                        value={data.note}
                        onChange={(e) => setData('note', e.target.value)}
                        rows={4}
                        maxLength={NOTE_MAX}
                        placeholder="Say something nice…"
                    />
                </FormField>
                <CharCount length={data.note.length} max={NOTE_MAX} />
            </div>
        </FormSheet>
    );
}
