import type { Page } from '@inertiajs/core';
import { useForm, usePage } from '@inertiajs/react';
import {
    forwardRef,
    lazy,
    Suspense,
    useEffect,
    useId,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { count } from '@/lib/plural';
import {
    birthdayOf,
    birthdaysOn,
    firstName,
    possessive,
} from '@/MiniApps/History/lib/birthdays';
import type { MemberBirthday } from '@/MiniApps/History/lib/types';
import events from '@/routes/apps/our-history/events';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import PlacesLocationField, {
    ManualLocationInput,
    useHasPlacesSearch,
} from '@/Shell/Components/PlacesLocationField';
import type { SelectedLocationView } from '@/Shell/Components/PlacesLocationField';
import type { Person } from '@/types/person';
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
    birthday_user_id: number | null;
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
    birthday_user_id: number | null;
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
    /* Who has a birthday when, for "Is this Meera's birthday?". */
    birthdays?: MemberBirthday[];
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

const NOBODY = 'none';

type BirthdayQuestionProps = {
    people: Person[];
    value: number | null;
    onChange: (id: number | null) => void;
    error?: string;
};

/* Asked when the date is a member's birthday; "No" is the answer until someone says yes. */
function BirthdayQuestion({
    people,
    value,
    onChange,
    error,
}: BirthdayQuestionProps) {
    const legendId = useId();
    const question =
        people.length === 1
            ? `Is this ${possessive(firstName(people[0].name))} birthday?`
            : 'Is this someone’s birthday?';

    return (
        <div className="history-birthday-question">
            <p id={legendId} className="history-field-label">
                {question}
            </p>
            <RadioGroup
                aria-labelledby={legendId}
                value={value === null ? NOBODY : String(value)}
                onValueChange={(next) =>
                    onChange(next === NOBODY ? null : Number(next))
                }
                className="history-birthday-choices"
            >
                {people.map((person) => (
                    <label key={person.id} className="history-birthday-choice">
                        <RadioGroupItem value={String(person.id)} />
                        <PersonAvatar person={person} size={24} />
                        <span>
                            {people.length === 1 ? 'Yes' : birthdayOf(person)}
                        </span>
                    </label>
                ))}
                <label className="history-birthday-choice">
                    <RadioGroupItem value={NOBODY} />
                    <span>No</span>
                </label>
            </RadioGroup>
            {error && (
                <p
                    role="alert"
                    className="mt-2 text-(length:--text-small) text-(--history-destructive)"
                >
                    {error}
                </p>
            )}
        </div>
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
            birthdays = [],
        },
        ref,
    ) {
        const closeAfterSave = onSaved ?? onDismiss;

        // A moment can't be dated after the household's today, whatever this device's clock says.
        const { today } = usePage().props;

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
            birthday_user_id: initialEvent?.birthday_user_id ?? null,
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

        const birthdayPeople = birthdaysOn(data.occurred_on, birthdays);

        const { isDirty, setDefaults } = form;

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
                patch(events.update({ event: eventId }).url, {
                    preserveScroll: true,
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
                        const createdId = page.flash?.created_event_id;
                        const newId =
                            typeof createdId === 'number' ? createdId : null;

                        if (newId !== null) {
                            // Seed from the ref: debounced data may still lag the last keystroke
                            // and falsely mark the form dirty.
                            setDefaults({
                                ...data,
                                body_html: bodyHtmlRef.current,
                            });

                            if (stagedCountRef.current === 0) {
                                toast.success('Saved.');
                                closeAfterSave();

                                return;
                            }

                            const stagedCount = stagedCountRef.current;
                            toast.success(
                                `Saved. Uploading ${count(stagedCount, 'item')}…`,
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
                            onChange={(e) => {
                                const date = e.target.value;
                                const stillMatches = birthdaysOn(
                                    date,
                                    birthdays,
                                ).some((p) => p.id === data.birthday_user_id);

                                setData((d) => ({
                                    ...d,
                                    occurred_on: date,
                                    birthday_user_id: stillMatches
                                        ? d.birthday_user_id
                                        : null,
                                }));
                            }}
                            className="history-date-input shell-field"
                        />
                        {errors.occurred_on && (
                            <p
                                role="alert"
                                className="mt-2 text-(length:--text-small) text-(--history-destructive)"
                            >
                                {errors.occurred_on}
                            </p>
                        )}
                        {birthdayPeople.length > 0 && (
                            <BirthdayQuestion
                                people={birthdayPeople}
                                value={data.birthday_user_id}
                                onChange={(id) =>
                                    setData('birthday_user_id', id)
                                }
                                error={errors.birthday_user_id}
                            />
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
                            className="history-date-input shell-field"
                        />
                    </div>

                    <div className="[grid-area:loc]">
                        <FormFieldLabel
                            htmlFor={
                                hasPlacesSearch ? undefined : 'event-location'
                            }
                        >
                            Location
                        </FormFieldLabel>
                        {hasPlacesSearch ? (
                            <PlacesLocationField
                                label="Location"
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
                                className="mt-2 text-(length:--text-small) text-(--history-destructive)"
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
