import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    destroy as activitiesDestroy,
    toggleDone as activitiesToggleDone,
} from '@/routes/apps/our-corner/activities';
import {
    destroy as moviesDestroy,
    toggleDone as moviesToggleDone,
} from '@/routes/apps/our-corner/movies';
import {
    destroy as placesDestroy,
    toggleDone as placesToggleDone,
} from '@/routes/apps/our-corner/places';
import {
    destroy as songsDestroy,
    toggleDone as songsToggleDone,
} from '@/routes/apps/our-corner/songs';

/* Our own timer: whether sonner fires onDismiss on an action click is unverified. */
export const DELETE_GRACE_PERIOD_MS = 5000;

export type ItemPermissions = {
    update: boolean;
    delete: boolean;
};

export type CornerItemType = 'songs' | 'movies' | 'activities' | 'places';

export type UseItemActionsOptions = {
    type: CornerItemType;
    id: number;
    title: string | null;
    onOpenEdit?: () => void;
    /* Runs last: the toast must exist before a detail page navigates away. */
    onDeleted?: () => void;
};

export type UseItemActionsReturn = {
    isPendingDelete: boolean;
    handleEdit: () => void;
    handleToggleDone: () => void;
    handleDelete: () => void;
    handleUndo: () => void;
};

const ROUTE_HELPERS: Record<
    CornerItemType,
    {
        toggleDoneUrl: (id: number) => string;
        destroyUrl: (id: number) => string;
    }
> = {
    songs: {
        toggleDoneUrl: (id) => songsToggleDone.url(id),
        destroyUrl: (id) => songsDestroy.url(id),
    },
    movies: {
        toggleDoneUrl: (id) => moviesToggleDone.url(id),
        destroyUrl: (id) => moviesDestroy.url(id),
    },
    activities: {
        toggleDoneUrl: (id) => activitiesToggleDone.url(id),
        destroyUrl: (id) => activitiesDestroy.url(id),
    },
    places: {
        toggleDoneUrl: (id) => placesToggleDone.url(id),
        destroyUrl: (id) => placesDestroy.url(id),
    },
};

type PendingDelete = {
    timerId: ReturnType<typeof setTimeout>;
    toastId: string | number;
};

export function useItemActions({
    type,
    id,
    title,
    onOpenEdit,
    onDeleted,
}: UseItemActionsOptions): UseItemActionsReturn {
    const [isPendingDelete, setIsPendingDelete] = useState(false);

    const pendingRef = useRef<PendingDelete | null>(null);

    const handleEdit = () => {
        onOpenEdit?.();
    };

    const handleToggleDone = () => {
        router.patch(
            ROUTE_HELPERS[type].toggleDoneUrl(id),
            {},
            { preserveScroll: true },
        );
    };

    const handleUndo = () => {
        const pending = pendingRef.current;

        if (!pending) {
            return;
        }

        clearTimeout(pending.timerId);
        toast.dismiss(pending.toastId);
        pendingRef.current = null;
        setIsPendingDelete(false);
    };

    const handleDelete = () => {
        setIsPendingDelete(true);

        const timerId = setTimeout(() => {
            router.delete(ROUTE_HELPERS[type].destroyUrl(id), {
                preserveScroll: true,
            });
        }, DELETE_GRACE_PERIOD_MS);

        const toastId = toast(`Removed ${title ?? 'item'}`, {
            duration: DELETE_GRACE_PERIOD_MS,
            action: {
                label: 'Undo',
                onClick: handleUndo,
            },
        });

        pendingRef.current = { timerId, toastId };

        // 4. LAST — after the toast exists. On a detail page this navigates
        // away; the toast must already be raised so it survives.
        onDeleted?.();
    };

    return {
        isPendingDelete,
        handleEdit,
        handleToggleDone,
        handleDelete,
        handleUndo,
    };
}
