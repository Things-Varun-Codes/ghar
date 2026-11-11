import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
import { buttonVariants } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import { readXsrfToken } from '@/lib/csrf';
import { captureSilent } from '@/lib/observability';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { generate, store } from '@/routes/apps/our-mailbox/bouquets';
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
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    useBodyScrollLock(open);

    const [discardOpen, setDiscardOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
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

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setSaveError(null);
            setGenError(null);
        }

        if (!next && isDirty) {
            setDiscardOpen(true);

            return;
        }

        onOpenChange(next);
    };

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: () => handleOpenChange(false),
    });

    const handleReset = () => {
        reset();
        gateReset();
        setRefine('');
        setGenerating(false);
        setGenError(null);
        setSaveError(null);
        setDiscardOpen(false);
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

    const handleGenerate = async () => {
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

    const handleSend = () => {
        setSaveError(null);
        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
            onError: (errs) => {
                const first = Object.values(errs)[0] ?? null;
                setSaveError(
                    first ?? 'Could not send bouquet. Please try again.',
                );
            },
        });
    };

    const generateDisabled =
        data.flowers.length === 0 || generating || processing;
    const sendDisabled =
        data.image === null ||
        processing ||
        generating ||
        genError !== null ||
        data.recipient_ids.length === 0;

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side={side}
                    data-app="our-mailbox"
                    className="mailbox-sheet-content [&_button.absolute]:!opacity-100"
                    style={{
                        maxWidth: side === 'right' ? '640px' : undefined,
                        width: side === 'right' ? '90vw' : '100%',
                        height: side === 'bottom' ? '90dvh' : '100dvh',
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>Arrange a bouquet</SheetTitle>
                    </SheetHeader>

                    <div {...swipeHandlers} className="mailbox-sheet-scroll">
                        <div className="flex flex-col gap-5 p-4">
                            <RecipientPicker
                                members={members}
                                value={data.recipient_ids}
                                onChange={(ids) =>
                                    setData('recipient_ids', ids)
                                }
                                errors={errors}
                            />

                            <section aria-label="Choose flowers">
                                <p className="mb-2.5 text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-ink-soft)">
                                    Pick up to {MAX_FLOWERS} flowers
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {flowers.map((flower) => {
                                        const selected = data.flowers.includes(
                                            flower.key,
                                        );
                                        const atMax =
                                            data.flowers.length >=
                                                MAX_FLOWERS && !selected;

                                        return (
                                            <button
                                                key={flower.key}
                                                type="button"
                                                disabled={
                                                    atMax ||
                                                    generating ||
                                                    processing
                                                }
                                                aria-pressed={selected}
                                                title={flower.meaning}
                                                onClick={() =>
                                                    toggleFlower(flower.key)
                                                }
                                                className="mailbox-flower-chip"
                                                style={{
                                                    border: `1.5px solid ${
                                                        selected
                                                            ? 'var(--mailbox-accent)'
                                                            : 'var(--mailbox-border)'
                                                    }`,
                                                    background: selected
                                                        ? 'var(--mailbox-accent)'
                                                        : 'transparent',
                                                    color: selected
                                                        ? 'var(--mailbox-accent-fg)'
                                                        : atMax
                                                          ? 'var(--mailbox-ink-soft)'
                                                          : 'var(--mailbox-ink)',
                                                    cursor:
                                                        atMax ||
                                                        generating ||
                                                        processing
                                                            ? 'not-allowed'
                                                            : 'pointer',
                                                    opacity: atMax ? 0.45 : 1,
                                                }}
                                            >
                                                {flower.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <div>
                                <label
                                    htmlFor="bouquet-refine"
                                    className="mailbox-field-label"
                                >
                                    Style or mood (optional)
                                </label>
                                <input
                                    id="bouquet-refine"
                                    type="text"
                                    value={refine}
                                    onChange={(e) => setRefine(e.target.value)}
                                    disabled={generating || processing}
                                    placeholder="e.g. wild meadow, bright and cheerful…"
                                    className="mailbox-bouquet-mood-input"
                                />
                            </div>

                            <div>
                                <SubmitButton
                                    type="button"
                                    processing={generating}
                                    disabled={generateDisabled}
                                    busyText="Arranging your bouquet…"
                                    onClick={handleGenerate}
                                    className="mailbox-btn-arrange"
                                >
                                    Arrange my bouquet
                                </SubmitButton>
                            </div>

                            {(generating || data.image || genError) && (
                                <div className="mailbox-bouquet-stage">
                                    {generating && (
                                        <div
                                            aria-busy="true"
                                            aria-label="Arranging your bouquet…"
                                            className="mailbox-bouquet-shimmer"
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
                                            className="block h-full w-full rounded-[8px] object-cover"
                                        />
                                    )}
                                    {!generating && genError && (
                                        <div
                                            role="alert"
                                            className="p-4 text-center"
                                        >
                                            <p className="mx-0 mt-0 mb-2.5 text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-destructive)">
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
                                <label
                                    htmlFor="bouquet-note"
                                    className="mailbox-field-label"
                                >
                                    Add a note (optional)
                                </label>
                                <textarea
                                    id="bouquet-note"
                                    className="mailbox-hand mailbox-bouquet-note-input"
                                    value={data.note}
                                    onChange={(e) =>
                                        setData('note', e.target.value)
                                    }
                                    rows={4}
                                    maxLength={NOTE_MAX}
                                    placeholder="Say something nice…"
                                />
                                {errors.note && (
                                    <p
                                        role="alert"
                                        className="mx-0 mt-1 mb-0 text-[13px] text-(--mailbox-destructive)"
                                    >
                                        {errors.note}
                                    </p>
                                )}
                            </div>

                            {saveError && (
                                <p
                                    role="alert"
                                    className="m-0 text-(length:--mailbox-type-scale-eyebrow) text-(--mailbox-destructive)"
                                >
                                    {saveError}
                                </p>
                            )}

                            <div className="mt-2 flex justify-end">
                                <SubmitButton
                                    type="button"
                                    processing={processing}
                                    disabled={sendDisabled}
                                    busyText="Sending…"
                                    onClick={handleSend}
                                >
                                    Send bouquet
                                </SubmitButton>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discard this bouquet?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Your flower selection and preview will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                handleReset();
                                onOpenChange(false);
                            }}
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
