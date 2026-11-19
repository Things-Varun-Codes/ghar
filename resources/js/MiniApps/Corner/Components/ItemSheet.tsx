import { useForm } from '@inertiajs/react';
import { ImageOff, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { formSubmitOptions } from '@/lib/mutation';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { useLinkPreview } from '@/MiniApps/Corner/Hooks/useLinkPreview';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { store, update } from '@/routes/apps/our-shelf/items';
import { preview as picturePreview } from '@/routes/apps/our-shelf/picture';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import LoadingState from '@/Shell/Components/LoadingState';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    list: CornerListInfo;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /* Set when editing. */
    item?: CornerItem;
};

type FormShape = {
    url: string;
    title: string;
    image_url: string;
    no_picture: boolean;
    notes: string;
    location: string;
    address: string;
};

const SHOWN_FIELDS = [
    'url',
    'title',
    'image_url',
    'notes',
    'location',
    'address',
];

/* What the location field shows for an item: the link it came from, else its name or point. */
function locationOf(item: CornerItem): string {
    if (item.location_url) {
        return item.location_url;
    }

    if (item.location_label) {
        return item.location_label;
    }

    return item.lat !== null && item.lng !== null
        ? `${item.lat}, ${item.lng}`
        : '';
}

function shapeOf(item?: CornerItem): FormShape {
    return {
        url: item?.url ?? '',
        title: item?.title ?? '',
        image_url: item?.image_url ?? '',
        no_picture: false,
        notes: item?.notes ?? '',
        location: item ? locationOf(item) : '',
        address: item?.address ?? '',
    };
}

/*
 * Adding to a list, or changing what is in it. Every part is optional but a name, and a pasted
 * link offers one: the page is read for its name and picture while the person carries on. A
 * typed name or picture always wins over what the page says.
 */
export default function ItemSheet({ list, open, onOpenChange, item }: Props) {
    const isEdit = item !== undefined;
    const form = useForm<FormShape>(shapeOf(item));
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty } = form;

    // The picture someone chose or typed, as opposed to one a link offered.
    const [pictureChosen, setPictureChosen] = useState(
        Boolean(item?.image_url),
    );
    const [pictureFieldOpen, setPictureFieldOpen] = useState(false);

    const link = useLinkPreview((found) => {
        if (!pictureChosen && found.image_url) {
            setData((prev) => ({
                ...prev,
                image_url: found.image_url ?? '',
                no_picture: false,
            }));
        }
    });

    const changeUrl = (next: string) => {
        setData('url', next);
        link.trigger(next);
    };

    const changeLocation = (next: string) => {
        setData('location', next);
    };

    const removePicture = () => {
        setPictureChosen(true);
        setPictureFieldOpen(false);
        setData((prev) => ({ ...prev, image_url: '', no_picture: true }));
    };

    // Previewed once typing stops, not for every half-typed address.
    const pictureAddress = useDeferredTyping(data.image_url.trim());
    const pictureSrc =
        pictureAddress === ''
            ? null
            : item && data.image_url === item.image_url
              ? item.picture_url
              : picturePreview.url({ query: { url: pictureAddress } });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            ...formSubmitOptions({
                component: 'Corner/ItemSheet',
                action: isEdit ? 'item.update' : 'item.create',
                isShownField: (key) => SHOWN_FIELDS.includes(key),
                onSuccess: () => {
                    reset();
                    link.clear();
                    onOpenChange(false);
                },
            }),
        };

        if (isEdit) {
            patch(update.url(item.id), options);
        } else {
            post(store.url(list.slug), options);
        }
    };

    const found = link.preview.kind === 'ok' ? link.preview : null;

    return (
        <FormSheet
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    link.cancel();
                }

                onOpenChange(next);
            }}
            title={isEdit ? 'Edit' : `Add to ${list.name}`}
            description="A name, and if you like a link, a picture, notes and a place."
            isDirty={isDirty}
            onDiscard={() => {
                reset();
                link.clear();
            }}
            onSubmit={handleSubmit}
            footer={
                <SubmitButton
                    processing={processing}
                    busyText={isEdit ? 'Saving…' : 'Adding…'}
                >
                    {isEdit ? 'Save changes' : 'Add'}
                </SubmitButton>
            }
        >
            <FormField label="Link (optional)" name="url" error={errors.url}>
                <Input
                    id="url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="Paste a link to anything"
                    maxLength={2048}
                    value={data.url}
                    onChange={(e) => changeUrl(e.target.value)}
                    onBlur={(e) => link.trigger(e.target.value)}
                    className="text-(length:--text-body)"
                />
            </FormField>

            {link.preview.kind === 'loading' && (
                <LoadingState rows={1} variant="card" />
            )}

            {link.preview.kind === 'error' && (
                <p role="status" className="corner-form-note">
                    {link.preview.message}
                    <button
                        type="button"
                        className="corner-text-button"
                        onClick={() => link.retry(data.url)}
                    >
                        <RotateCw aria-hidden="true" size={14} />
                        Try again
                    </button>
                </p>
            )}

            <FormField label="Name" name="title" error={errors.title}>
                <Input
                    id="title"
                    type="text"
                    autoComplete="off"
                    maxLength={255}
                    placeholder={
                        found?.title ??
                        (data.url ? 'What the page calls itself' : '')
                    }
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    className="text-(length:--text-body)"
                />
            </FormField>

            <div className="corner-picture-field">
                <span className="corner-field-label">Picture</span>
                <div className="corner-picture-row">
                    <ItemThumb
                        pictureUrl={pictureSrc}
                        icon={list.icon}
                        size="md"
                    />
                    <div className="corner-picture-actions">
                        <button
                            type="button"
                            className="corner-text-button"
                            aria-expanded={pictureFieldOpen}
                            aria-controls="image_url"
                            onClick={() =>
                                setPictureFieldOpen(!pictureFieldOpen)
                            }
                        >
                            {data.image_url
                                ? 'Use another picture'
                                : 'Add a picture'}
                        </button>
                        {data.image_url && (
                            <button
                                type="button"
                                className="corner-text-button"
                                onClick={removePicture}
                            >
                                <ImageOff aria-hidden="true" size={14} />
                                Remove picture
                            </button>
                        )}
                    </div>
                </div>
                {(pictureFieldOpen || errors.image_url) && (
                    <FormField
                        label="Picture address"
                        name="image_url"
                        error={errors.image_url}
                    >
                        <Input
                            id="image_url"
                            type="url"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://… ending in .jpg, .png or similar"
                            maxLength={2048}
                            value={data.image_url}
                            onChange={(e) => {
                                setPictureChosen(true);
                                setData((prev) => ({
                                    ...prev,
                                    image_url: e.target.value,
                                    no_picture: e.target.value.trim() === '',
                                }));
                            }}
                            className="text-(length:--text-body)"
                        />
                    </FormField>
                )}
            </div>

            <NotesField
                value={data.notes}
                onChange={(v) => setData('notes', v)}
                error={errors.notes}
            />

            <FormField
                label="Where (optional)"
                name="location"
                error={errors.location}
            >
                <Input
                    id="location"
                    type="text"
                    autoComplete="off"
                    placeholder="A map link, coordinates or the name of a place"
                    maxLength={2048}
                    value={data.location}
                    onChange={(e) => changeLocation(e.target.value)}
                    className="text-(length:--text-body)"
                />
            </FormField>

            {data.location.trim() !== '' && (
                <FormField
                    label="Address (optional)"
                    name="address"
                    error={errors.address}
                >
                    <Input
                        id="address"
                        type="text"
                        autoComplete="off"
                        maxLength={1024}
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        className="text-(length:--text-body)"
                    />
                </FormField>
            )}
        </FormSheet>
    );
}

const TYPING_PAUSE_MS = 500;

/* The value once it has stopped changing for a moment. */
function useDeferredTyping(value: string): string {
    const [settled, setSettled] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setSettled(value),
            TYPING_PAUSE_MS,
        );

        return () => window.clearTimeout(timer);
    }, [value]);

    return settled;
}
