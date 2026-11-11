import type { Page } from '@inertiajs/core';
import { useForm } from '@inertiajs/react';
import {
    forwardRef,
    lazy,
    Suspense,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import events from '@/routes/apps/our-history/events';
import PlacesLocationField, {
    ManualLocationInput,
    useHasPlacesSearch,
} from '@/Shell/Components/PlacesLocationField';
import type { SelectedLocationView } from '@/Shell/Components/PlacesLocationField';
import CurrentMediaStrip from './CurrentMediaStrip';
import type { MediaItem } from './MediaGrid';
import MediaUploader from './MediaUploader';

// Lazy-load the TipTap editor so read-mode event views never download
// ProseMirror. lazy() defers the import('./TiptapEditor') call until this
// component first renders; EventForm never renders in read mode (EventSheet
// gates it behind `displayMode === 'read' ? <EventReadView/> : <EventForm/>`),
// so the read path never triggers the fetch.
const TiptapEditor = lazy(() => import('./TiptapEditor'));

type InitialEvent = {
    occurred_on: string;
    title: string;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string;
};

type FormData = {
    occurred_on: string;
    title: string;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string;
};

export type EventFormHandle = {
    submitNormal: () => void;
    isDirty: boolean;
};

type EventFormProps = {
    onDismiss: () => void;
    eventId?: number | null;
    initialEvent?: InitialEvent;
    onDirtyChange?: (dirty: boolean) => void;
    onCreated?: (newId: number) => void;
    onSaved?: () => void;
    onProcessingChange?: (processing: boolean) => void;
    initialMedia?: MediaItem[];
};

type FormFieldLabelProps = {
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
};

function FormFieldLabel({ htmlFor, required, children }: FormFieldLabelProps) {
    return (
        <label htmlFor={htmlFor} className="history-field-label">
            {children}
            {required && (
                <>
                    {' '}
                    <span aria-hidden="true">*</span>
                </>
            )}
        </label>
    );
}

const EventForm = forwardRef<EventFormHandle, EventFormProps>(
    function EventForm(
        {
            onDismiss,
            eventId: eventIdProp = null,
            initialEvent,
            initialMedia,
            onDirtyChange,
            onProcessingChange,
            onCreated,
            onSaved,
        },
        ref,
    ) {
        const closeAfterSave = onSaved ?? onDismiss;

        // Cap the date input at today so a moment can't be
        // dated in the future. Build the YYYY-MM-DD string from LOCAL date parts,
        // NOT new Date().toISOString() — for users ahead of UTC the early-morning UTC date
        // is still "yesterday", which would wrongly block a legitimately-today
        // event. A fixed value for the render is fine (no memo needed).
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const [eventId, setEventId] = useState<number | null>(eventIdProp);

        const [currentMedia, setCurrentMedia] = useState<MediaItem[]>(
            initialMedia ?? [],
        );

        useEffect(() => {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop→state mirror; mirrors the eventId pattern above
            setCurrentMedia(initialMedia ?? []);
        }, [initialMedia]);

        // A ref, so staged-count changes don't re-render the form.
        const stagedCountRef = useRef(0);

        useEffect(() => {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop→state mirror; see comment above
            setEventId(eventIdProp);
        }, [eventIdProp]);

        const form = useForm<FormData>({
            occurred_on: initialEvent?.occurred_on ?? '',
            title: initialEvent?.title ?? '',
            location_freetext: initialEvent?.location_freetext ?? null,
            location_place_id: initialEvent?.location_place_id ?? null,
            location_name: initialEvent?.location_name ?? null,
            location_address: initialEvent?.location_address ?? null,
            location_lat: initialEvent?.location_lat ?? null,
            location_lng: initialEvent?.location_lng ?? null,
            body_html: initialEvent?.body_html ?? '',
        });
        const {
            data,
            setData,
            transform,
            post,
            patch,
            processing,
            errors,
            reset,
        } = form;

        // Never lags: TiptapEditor writes here on every keystroke, while setData is debounced.
        const bodyHtmlRef = useRef<string>(initialEvent?.body_html ?? '');

        const hasPlacesSearch = useHasPlacesSearch();

        const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
            fields: [
                'occurred_on',
                'title',
                'location_freetext',
                'location_place_id',
                'location_name',
                'location_address',
                'location_lat',
                'location_lng',
                'body_html',
            ],
        });

        useEffect(() => {
            onDirtyChange?.(isDirty);
        }, [isDirty, onDirtyChange]);

        const onProcessingChangeRef = useRef(onProcessingChange);
        useEffect(() => {
            onProcessingChangeRef.current = onProcessingChange;
        }, [onProcessingChange]);
        useEffect(() => {
            onProcessingChangeRef.current?.(processing);
        }, [processing]);

        function submitPath() {
            // transform runs at serialization, so the last keystroke ships even if setData lags.
            transform((d) => ({ ...d, body_html: bodyHtmlRef.current }));

            if (eventId !== null) {
                // preserveState: false: a PATCH doesn't change the total, so Timeline only re-seeds
                // on a remount.
                patch(events.update({ event: eventId }).url, {
                    preserveScroll: true,
                    preserveState: false,
                    onSuccess: () => {
                        reset();
                        toast.success('Changes saved.');
                        closeAfterSave();
                    },
                });
            } else {
                // preserveState is required: without it the redirect remounts Timeline and the
                // staged-upload drain never fires.
                post(events.store().url, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: (page: Page) => {
                        const flash = (
                            page.props as {
                                flash?: { created_event_id?: unknown };
                            }
                        ).flash;
                        const newId =
                            typeof flash?.created_event_id === 'number'
                                ? flash.created_event_id
                                : null;

                        if (newId !== null) {
                            // Seed from the ref: debounced data may still lag the last keystroke
                            // and falsely mark the form dirty.
                            gateReset({ body_html: bodyHtmlRef.current });

                            if (stagedCountRef.current === 0) {
                                toast.success('Saved.');
                                closeAfterSave();

                                return;
                            }

                            const stagedCount = stagedCountRef.current;
                            toast.success(
                                `Saved. Uploading ${stagedCount} ${
                                    stagedCount === 1 ? 'item' : 'items'
                                }…`,
                            );

                            setEventId(newId);
                            onCreated?.(newId);

                            return;
                        }

                        reset();
                        toast.success('Saved.');
                        closeAfterSave();
                    },
                });
            }
        }

        useImperativeHandle(ref, () => ({
            submitNormal: () => submitPath(),
            isDirty,
        }));

        function handleFormSubmit(e: React.FormEvent) {
            e.preventDefault();
            submitPath();
        }

        return (
            <form onSubmit={handleFormSubmit}>
                <div className="history-form-layout">
                    <div className="[grid-area:date]">
                        <FormFieldLabel htmlFor="event-occurred-on" required>
                            Date
                        </FormFieldLabel>
                        <input
                            id="event-occurred-on"
                            type="date"
                            required
                            aria-required="true"
                            max={today}
                            value={data.occurred_on}
                            onChange={(e) =>
                                setData('occurred_on', e.target.value)
                            }
                            className="history-date-input"
                        />
                        {errors.occurred_on && (
                            <p
                                role="alert"
                                className="mt-1 text-(length:--text-meta) text-(--history-destructive)"
                            >
                                {errors.occurred_on}
                            </p>
                        )}
                    </div>

                    <div className="[grid-area:title]">
                        <FormFieldLabel htmlFor="event-title">
                            Title
                        </FormFieldLabel>
                        <input
                            id="event-title"
                            type="text"
                            maxLength={200}
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="e.g. Grandma's 80th"
                            className="history-date-input"
                        />
                    </div>

                    <div className="[grid-area:loc]">
                        <FormFieldLabel htmlFor="event-location">
                            Location
                        </FormFieldLabel>
                        {hasPlacesSearch ? (
                            <PlacesLocationField
                                value={(() => {
                                    if (
                                        data.location_name ||
                                        data.location_address ||
                                        data.location_place_id
                                    ) {
                                        const v: SelectedLocationView = {
                                            name: data.location_name,
                                            address: data.location_address,
                                        };

                                        return v;
                                    }

                                    return null;
                                })()}
                                onSelect={(loc) => {
                                    setData(
                                        'location_place_id',
                                        loc?.place_id ?? null,
                                    );
                                    setData('location_name', loc?.name ?? null);
                                    setData(
                                        'location_address',
                                        loc?.address ?? null,
                                    );
                                    setData('location_lat', loc?.lat ?? null);
                                    setData('location_lng', loc?.lng ?? null);
                                }}
                            />
                        ) : (
                            <ManualLocationInput
                                id="event-location"
                                value={data.location_freetext ?? ''}
                                onChange={(value) =>
                                    setData('location_freetext', value || null)
                                }
                                placeholder="Where was it?"
                                maxLength={200}
                            />
                        )}
                    </div>

                    <div className="[grid-area:body]">
                        <FormFieldLabel>Story</FormFieldLabel>
                        <Suspense
                            fallback={
                                <div
                                    className="tiptap-editor-shell"
                                    aria-busy="true"
                                />
                            }
                        >
                            <TiptapEditor
                                value={data.body_html}
                                onChange={(html) => setData('body_html', html)}
                                htmlRef={bodyHtmlRef}
                            />
                        </Suspense>
                        {errors.body_html && (
                            <p
                                role="alert"
                                className="mt-1 text-(length:--text-meta) text-(--history-destructive)"
                            >
                                {errors.body_html}
                            </p>
                        )}
                    </div>

                    <div className="[grid-area:media]">
                        {eventId !== null && currentMedia.length > 0 && (
                            <CurrentMediaStrip
                                eventId={eventId}
                                media={currentMedia}
                                onDeleted={(mediaId) => {
                                    setCurrentMedia((prev) =>
                                        prev.filter((m) => m.id !== mediaId),
                                    );
                                }}
                            />
                        )}
                        <MediaUploader
                            eventId={eventId}
                            onStagedCountChange={(c) => {
                                stagedCountRef.current = c;
                            }}
                        />
                    </div>
                </div>
            </form>
        );
    },
);

export default EventForm;
