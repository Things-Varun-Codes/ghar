import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useId, useState } from 'react';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { readXsrfToken } from '@/lib/csrf';
import { transportFailureOptions } from '@/lib/mutation';
import { captureSilent } from '@/lib/observability';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import ComposeSheet from '@/MiniApps/Mailbox/Components/ComposeSheet';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import {
    reportRejected,
    SEND_FAILED_MESSAGE,
    toastUnshownErrors,
} from '@/MiniApps/Mailbox/lib/visitFailure';
import { generate, store } from '@/routes/apps/our-mailbox/bouquets';
import FormField from '@/Shell/Components/FormField';
import SubmitButton from '@/Shell/Components/SubmitButton';

type BouquetFormShape = {
    recipient_ids: number[];
    flowers: string[];
    note: string;
    image: string | null;
    mime: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    flowers: FlowerEntry[];
    members: HouseholdMember[];
};

const MAX_FLOWERS = 5;
const NOTE_MAX = 600;

const isShownField = (key: string) =>
    key === 'note' ||
    key.startsWith('flowers') ||
    key.startsWith('recipient_ids');

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

export default function BouquetSheet({
    open,
    onOpenChange,
    flowers,
    members,
}: Props) {
    const hintId = useId();
    const flowersNoteId = useId();
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [refine, setRefine] = useState('');
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

    const form = useForm<BouquetFormShape>({
        recipient_ids: defaultRecipientIds(members),
        flowers: [],
        note: '',
        image: null,
        mime: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { isDirty: noteIsDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['note'],
    });
    const isDirty = noteIsDirty || data.image !== null;

    const handleReset = () => {
        reset();
        gateReset();
        setRefine('');
        setGenerating(false);
        setGenError(null);
        setPreviewUrl(null); // effect cleanup revokes the prior blob URL
    };

    const toggleFlower = (key: string) => {
        const current = data.flowers;
        const next = current.includes(key)
            ? current.filter((k) => k !== key)
            : current.length < MAX_FLOWERS
              ? [...current, key]
              : current;
        setData('flowers', next);
    };

    const generateDisabled =
        data.flowers.length === 0 || generating || processing;

    const handleGenerate = async () => {
        if (generateDisabled) {
            return;
        }

        setGenerating(true);
        setGenError(null);

        try {
            const res = await fetch(generate.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({
                    flowers: data.flowers,
                    refine: refine.trim() || undefined,
                }),
            });

            if (!res.ok) {
                let msg = 'Could not arrange your bouquet. Please try again.';

                try {
                    const json = (await res.json()) as { message?: string };

                    if (json.message) {
                        msg = json.message;
                    }
                    // eslint-disable-next-line local/no-silent-error -- JSON parse failure on error body; msg already set to fallback string
                } catch {
                    // intentionally silent — fallback msg already set
                }

                setGenError(msg);

                return;
            }

            const json = (await res.json()) as { image: string; mime: string };
            setData('image', json.image);
            setData('mime', json.mime);
            setPreviewUrl(base64ToObjectUrl(json.image, json.mime));
        } catch (err) {
            setGenError('Could not arrange your bouquet. Please try again.');
            captureSilent(
                err instanceof Error
                    ? err
                    : new Error('bouquet.generate failed'),
                {
                    component: 'Mailbox/BouquetSheet',
                    action: 'bouquet.generate',
                    surface: 'frontend',
                },
            );
        } finally {
            setGenerating(false);
        }
    };

    const hint =
        data.recipient_ids.length === 0
            ? 'Choose who they’re for.'
            : data.flowers.length === 0
              ? 'Pick at least one flower.'
              : generating
                ? null
                : data.image === null || genError !== null
                  ? 'Arrange the bouquet first.'
                  : null;
    const sendDisabled = processing || generating || hint !== null;

    const handleSend = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (sendDisabled) {
            return;
        }

        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
            onError: (errs) => {
                toastUnshownErrors(errs, isShownField, SEND_FAILED_MESSAGE);
                reportRejected('Mailbox/BouquetSheet', 'bouquet.create', errs);
            },
            ...transportFailureOptions({
                component: 'Mailbox/BouquetSheet',
                action: 'bouquet.create',
                message: SEND_FAILED_MESSAGE,
            }),
        });
    };

    const flowersError = Object.entries(errors).find(([key]) =>
        key.startsWith('flowers'),
    )?.[1];

    return (
        <ComposeSheet
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setGenError(null);
                }

                onOpenChange(next);
            }}
            title="Arrange a bouquet"
            description="Pick flowers, arrange a bouquet and choose who it goes to."
            isDirty={isDirty}
            discardTitle="Discard this bouquet?"
            discardBody="Your flower selection and preview will be lost."
            onDiscard={handleReset}
            onSubmit={handleSend}
            hint={processing ? null : hint}
            hintId={hintId}
            actions={
                <SubmitButton
                    processing={processing}
                    disabled={sendDisabled}
                    busyText="Sending…"
                    aria-describedby={hint ? hintId : undefined}
                >
                    Send bouquet
                </SubmitButton>
            }
        >
            <RecipientPicker
                members={members}
                value={data.recipient_ids}
                onChange={(ids) => setData('recipient_ids', ids)}
                errors={errors}
            />

            <fieldset
                className="mailbox-recipients"
                aria-describedby={flowersError ? flowersNoteId : undefined}
            >
                <legend className="mailbox-recipients-legend">
                    Pick up to {MAX_FLOWERS} flowers
                    <span aria-hidden="true" className="mailbox-required">
                        *
                    </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                    {flowers.map((flower) => {
                        const selected = data.flowers.includes(flower.key);
                        const atMax =
                            data.flowers.length >= MAX_FLOWERS && !selected;

                        return (
                            <button
                                key={flower.key}
                                type="button"
                                disabled={atMax || generating || processing}
                                aria-pressed={selected}
                                title={flower.meaning}
                                onClick={() => toggleFlower(flower.key)}
                                className="mailbox-flower-chip"
                            >
                                {flower.name}
                            </button>
                        );
                    })}
                </div>
                {flowersError && (
                    <p
                        id={flowersNoteId}
                        role="alert"
                        className="mailbox-field-error"
                    >
                        {flowersError}
                    </p>
                )}
            </fieldset>

            <FormField
                label="Style or mood (optional)"
                name="bouquet-refine"
                className="mailbox-form-field"
            >
                <input
                    id="bouquet-refine"
                    type="text"
                    value={refine}
                    onChange={(e) => setRefine(e.target.value)}
                    onKeyDown={(e) => {
                        // Enter here arranges the bouquet rather than sending the form.
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleGenerate();
                        }
                    }}
                    disabled={generating || processing}
                    placeholder="e.g. wild meadow, bright and cheerful…"
                    className="mailbox-bouquet-mood-input"
                />
            </FormField>

            <div>
                <SubmitButton
                    type="button"
                    processing={generating}
                    disabled={generateDisabled}
                    busyText="Arranging your bouquet…"
                    onClick={handleGenerate}
                    variant="outline"
                >
                    Arrange my bouquet
                </SubmitButton>
            </div>

            {(generating || data.image || genError) && (
                <div className="mailbox-bouquet-stage">
                    {generating && (
                        <div
                            role="status"
                            aria-busy="true"
                            aria-label="Arranging your bouquet…"
                            className="shell-skeleton h-full w-full"
                        />
                    )}
                    {!generating && !genError && data.image && (
                        <img
                            src={
                                previewUrl ??
                                `data:${data.mime};base64,${data.image}`
                            }
                            alt="Preview of your flower bouquet"
                            decoding="async"
                            className="block h-full w-full object-cover"
                        />
                    )}
                    {!generating && genError && (
                        <div role="alert" className="p-4 text-center">
                            <p className="mx-0 mt-0 mb-2 text-(length:--text-small) text-(--mailbox-destructive)">
                                {genError}
                            </p>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generateDisabled}
                                className="mailbox-link-retry"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div>
                <FormField
                    label="Add a note (optional)"
                    name="bouquet-note"
                    error={errors.note}
                    className="mailbox-form-field"
                >
                    <textarea
                        id="bouquet-note"
                        className="mailbox-hand mailbox-bouquet-note-input"
                        value={data.note}
                        onChange={(e) => setData('note', e.target.value)}
                        rows={4}
                        maxLength={NOTE_MAX}
                        placeholder="Say something nice…"
                    />
                </FormField>
                <CharCount length={data.note.length} max={NOTE_MAX} />
            </div>
        </ComposeSheet>
    );
}
