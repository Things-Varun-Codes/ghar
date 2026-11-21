import { HttpResponseError } from '@inertiajs/core';
import { http } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useId, useState } from 'react';
import { Fade, Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
    FieldDescription,
    FieldError,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { captureSilent } from '@/lib/observability';
import CharCount from '@/MiniApps/Mailbox/Components/CharCount';
import type { FlowerEntry } from '@/MiniApps/Mailbox/Components/NoteCard';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { useComposeForm } from '@/MiniApps/Mailbox/Hooks/useComposeForm';
import { generate, store } from '@/routes/apps/our-exchange/bouquets';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
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
    const flowersNoteId = useId();
    const meaningsId = useId();
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

    const compose = useComposeForm<BouquetFormShape>({
        component: 'Mailbox/BouquetSheet',
        action: 'bouquet.create',
        members,
        fields: {
            flowers: [],
            note: '',
            image: null,
            mime: '',
        },
        dirtyFields: ['note'],
        shownFields: ['note', 'flowers'],
        noRecipientHint: 'Choose who they’re for.',
        missing: (data) =>
            data.flowers.length === 0
                ? 'Pick at least one flower.'
                : generating
                  ? null
                  : data.image === null || genError !== null
                    ? 'Arrange the bouquet first.'
                    : null,
    });
    const { data, setData, processing, errors } = compose.form;
    const isDirty = compose.isDirty || data.image !== null;

    const handleReset = () => {
        compose.reset();
        setRefine('');
        setGenerating(false);
        setGenError(null);
        setPreviewUrl(null); // effect cleanup revokes the prior blob URL
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
            const res = await http.getClient().request({
                method: 'post',
                url: generate.url(),
                data: {
                    flowers: data.flowers,
                    refine: refine.trim() || undefined,
                },
                headers: { Accept: 'application/json' },
            });

            const json = JSON.parse(res.data) as {
                image: string;
                mime: string;
            };
            setData('image', json.image);
            setData('mime', json.mime);
            setPreviewUrl(base64ToObjectUrl(json.image, json.mime));
        } catch (err) {
            if (err instanceof HttpResponseError) {
                let msg = 'Could not arrange your bouquet. Please try again.';

                try {
                    const json = JSON.parse(err.response.data) as {
                        message?: string;
                    };

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

    const flowersError = Object.entries(errors).find(([key]) =>
        key.startsWith('flowers'),
    )?.[1];
    const chosen = data.flowers
        .map((key) => flowers.find((flower) => flower.key === key))
        .filter((flower): flower is FlowerEntry => flower !== undefined);

    return (
        <FormSheet
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
            discardDescription="Your flower selection and preview will be lost."
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

            <FieldSet
                className="mailbox-recipients gap-0"
                aria-describedby={
                    [
                        chosen.length > 0 && meaningsId,
                        flowersError && flowersNoteId,
                    ]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
            >
                <FieldLegend className="mailbox-recipients-legend">
                    Pick up to {MAX_FLOWERS} flowers
                    <span aria-hidden="true" className="mailbox-required">
                        *
                    </span>
                </FieldLegend>
                <ToggleGroup
                    multiple
                    value={data.flowers}
                    onValueChange={(next: string[]) => {
                        if (next.length <= MAX_FLOWERS) {
                            setData('flowers', next);
                        }
                    }}
                    disabled={generating || processing}
                    className="w-full"
                >
                    {flowers.map((flower) => {
                        const atMax =
                            data.flowers.length >= MAX_FLOWERS &&
                            !data.flowers.includes(flower.key);

                        return (
                            <Tooltip key={flower.key}>
                                <TooltipTrigger
                                    render={
                                        <ToggleGroupItem
                                            value={flower.key}
                                            disabled={atMax}
                                            className="mailbox-flower-chip shell-press"
                                        />
                                    }
                                >
                                    {flower.name}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {flower.meaning}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </ToggleGroup>
                {/* What each chosen flower says, printed: a tooltip never reaches a touch screen. */}
                <Reveal show={chosen.length > 0}>
                    <FieldDescription
                        id={meaningsId}
                        className="mailbox-field-helper"
                    >
                        {chosen
                            .map(
                                (flower) => `${flower.name}: ${flower.meaning}`,
                            )
                            .join(' · ')}
                    </FieldDescription>
                </Reveal>
                <FieldError id={flowersNoteId} className="mailbox-field-error">
                    {flowersError}
                </FieldError>
            </FieldSet>

            <FormField
                label="Style or mood (optional)"
                name="bouquet-refine"
                className="mailbox-form-field"
            >
                <Input
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
                            alt="Preview of your flower bouquet"
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
                    name="bouquet-note"
                    error={errors.note}
                    className="mailbox-form-field"
                >
                    <Textarea
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
        </FormSheet>
    );
}
