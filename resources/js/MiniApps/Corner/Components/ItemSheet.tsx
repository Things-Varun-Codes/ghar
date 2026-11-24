import { useForm } from '@inertiajs/react';
import { ImageOff, RotateCw } from 'lucide-react';
import { useId, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formSubmitOptions } from '@/lib/mutation';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { useLinkPreview } from '@/MiniApps/Corner/Hooks/useLinkPreview';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { store, update } from '@/routes/apps/our-shelf/items';
import { preview as picturePreview } from '@/routes/apps/our-shelf/picture';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
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
};

const SHOWN_FIELDS = ['url', 'title', 'image_url', 'notes'];

function shapeOf(item?: CornerItem): FormShape {
    return {
        url: item?.url ?? '',
        title: item?.title ?? '',
        image_url: item?.image_url ?? '',
        no_picture: false,
        notes: item?.notes ?? '',
    };
}

/*
 * Adding to a list, or changing what is in it. Every part is optional but a name, and a pasted
 * link offers one: the page is read for its name and picture while the person carries on. A
 * typed name or picture always wins over what the page says.
 */
export default function ItemSheet({ list, open, onOpenChange, item }: Props) {
    const isEdit = item !== undefined;
    const pictureLabelId = useId();
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

    const removePicture = () => {
        setPictureChosen(true);
        setPictureFieldOpen(false);
        setData((prev) => ({ ...prev, image_url: '', no_picture: true }));
    };

    // Previewed once typing stops, not for every half-typed address.
    const [pictureAddress] = useDebounceValue(data.image_url.trim(), 500);
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
            description="A name, and if you like a link, a picture and notes."
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
                    placeholder="Paste a link to anything, a map too"
                    maxLength={2048}
                    value={data.url}
                    onChange={(e) => changeUrl(e.target.value)}
                    onBlur={(e) => link.trigger(e.target.value)}
                    className="text-(length:--text-body)"
                />
            </FormField>

            <div className="corner-reveal-slot corner-reveal-slot--link">
                {/* Shaped like what it is reading for: a picture and a name. */}
                <Reveal
                    show={link.preview.kind === 'loading'}
                    className="corner-reveal"
                >
                    <div role="status" className="corner-link-reading">
                        <Skeleton className="corner-link-reading-thumb" />
                        <div className="corner-link-reading-lines">
                            <Skeleton className="h-4 w-3/5 rounded-[6px]" />
                            <Skeleton className="h-3.5 w-2/5 rounded-[6px]" />
                        </div>
                        <span className="sr-only">Reading the page…</span>
                    </div>
                </Reveal>

                <Reveal
                    show={link.preview.kind === 'error'}
                    className="corner-reveal"
                >
                    <p role="status" className="corner-form-note">
                        {link.preview.kind === 'error' && link.preview.message}
                        <Button
                            type="button"
                            variant="link"
                            className="corner-text-button"
                            onClick={() => link.retry(data.url)}
                        >
                            <RotateCw aria-hidden="true" size={14} />
                            Try again
                        </Button>
                    </p>
                </Reveal>
            </div>

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

            <div
                className="corner-picture-field"
                role="group"
                aria-labelledby={pictureLabelId}
            >
                <span id={pictureLabelId} className="corner-field-label">
                    Picture
                </span>
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
                <div className="corner-reveal-slot">
                    <Reveal
                        show={pictureFieldOpen || Boolean(errors.image_url)}
                        className="corner-reveal"
                    >
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
                                        no_picture:
                                            e.target.value.trim() === '',
                                    }));
                                }}
                                className="text-(length:--text-body)"
                            />
                        </FormField>
                    </Reveal>
                </div>
            </div>

            <NotesField
                value={data.notes}
                onChange={(v) => setData('notes', v)}
                error={errors.notes}
            />
        </FormSheet>
    );
}
