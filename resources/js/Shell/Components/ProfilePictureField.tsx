import { router } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { mutationOptions } from '@/lib/mutation';
import * as picture from '@/routes/settings/profile/picture';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import SubmitButton from '@/Shell/Components/SubmitButton';
import {
    cropPicture,
    PICTURE_ACCEPT,
    pictureProblem,
} from '@/Shell/lib/profile-picture';
import type { Person } from '@/types/person';

const COMPONENT = 'Settings/Profile';
const OPEN_FAILED = "Couldn't open that picture. Try another one.";

type Props = {
    person: Pick<Person, 'name' | 'avatar_url'>;
};

/*
 * Your own picture: choose one, place it in the circle, save. The crop starts centred and
 * filling the square, so Save alone is enough; dragging and pinching are there if wanted.
 */
export default function ProfilePictureField({ person }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [source, setSource] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [area, setArea] = useState<Area | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmingRemove, setConfirmingRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

    const open = source !== null;

    // The object URL holds the whole photo in memory until it is let go.
    useEffect(
        () => () => {
            if (source) {
                URL.revokeObjectURL(source);
            }
        },
        [source],
    );

    const close = () => {
        if (saving) {
            return;
        }

        setSource(null);
    };

    useOverlayHistory(open, close);

    const choose = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // So choosing the same file again still fires a change.
        event.target.value = '';

        if (!file) {
            return;
        }

        const problem = pictureProblem(file);

        if (problem) {
            toast.error(problem);

            return;
        }

        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setArea(null);
        setSource(URL.createObjectURL(file));
    };

    const unreadable = () => {
        toast.error(OPEN_FAILED);
        setSource(null);
    };

    const save = async () => {
        if (!source || !area) {
            return;
        }

        let file: File;

        try {
            file = await cropPicture(source, area);
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    component: COMPONENT,
                    action: 'picture.crop',
                    surface: 'frontend',
                },
            });
            unreadable();

            return;
        }

        router.post(
            picture.update.url(),
            { picture: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setSource(null),
                ...mutationOptions({
                    component: COMPONENT,
                    action: 'picture.upload',
                    onPendingChange: setSaving,
                    message: "Couldn't save your picture. Try again.",
                }),
            },
        );
    };

    const remove = () => {
        router.delete(picture.destroy.url(), {
            preserveScroll: true,
            ...mutationOptions({
                component: COMPONENT,
                action: 'picture.remove',
                onPendingChange: setRemoving,
            }),
        });
    };

    const hasPicture = person.avatar_url !== null;

    return (
        <section
            aria-labelledby="profile-picture-heading"
            className="flex items-center gap-5"
        >
            <PersonAvatar person={person} size={96} />
            <div className="flex min-w-0 flex-col items-start gap-2">
                <h2
                    id="profile-picture-heading"
                    className="os-settings-row-label"
                >
                    Your picture
                </h2>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shell-press"
                        onClick={() => inputRef.current?.click()}
                        disabled={saving || removing}
                    >
                        {hasPicture ? 'Change picture' : 'Add a picture'}
                    </Button>
                    {hasPicture && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shell-press"
                            onClick={() => setConfirmingRemove(true)}
                            disabled={saving || removing}
                        >
                            Remove
                        </Button>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept={PICTURE_ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={choose}
                    data-test="profile-picture-input"
                />
            </div>

            <Dialog
                open={open}
                onOpenChange={(next) => {
                    if (!next) {
                        close();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display text-(length:--text-title) font-normal">
                            Your picture
                        </DialogTitle>
                        <DialogDescription>
                            Drag to move it in the circle. Pinch or scroll to
                            zoom.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="os-settings-crop-area">
                        {source && (
                            <Cropper
                                image={source}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                objectFit="cover"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, pixels) => setArea(pixels)}
                                mediaProps={{ onError: unreadable }}
                                cropperProps={{
                                    'aria-label': 'Picture position',
                                }}
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="shell-press"
                            onClick={close}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <SubmitButton
                            type="button"
                            processing={saving}
                            busyText="Saving…"
                            disabled={!area}
                            onClick={() => void save()}
                            className="os-settings-submit shell-press px-5"
                        >
                            Save picture
                        </SubmitButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmingRemove}
                onOpenChange={setConfirmingRemove}
                title="Remove your picture?"
                description="Your initials show in its place."
                confirmLabel="Remove"
                variant="destructive"
                onConfirm={remove}
            />
        </section>
    );
}
