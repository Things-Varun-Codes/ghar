import { router } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { mutationOptions } from '@/lib/mutation';
import { count } from '@/lib/plural';
import EventSheet from '@/MiniApps/History/Components/EventSheet';
import MomentMap from '@/MiniApps/History/Components/MomentMap';
import PlaceButton from '@/MiniApps/History/Components/PlaceButton';
import { useMomentFromUrl } from '@/MiniApps/History/Hooks/useMomentFromUrl';
import HistoryLayout from '@/MiniApps/History/Layouts/HistoryLayout';
import { MOMENT_ONLY } from '@/MiniApps/History/lib/momentVisit';
import { groupPlaces, momentLabel } from '@/MiniApps/History/lib/places';
import type { MapPoint } from '@/MiniApps/History/lib/places';
import type {
    HistoryEvent,
    MemberBirthday,
} from '@/MiniApps/History/lib/types';
import EmptyState from '@/Shell/Components/EmptyState';

type Props = {
    points: MapPoint[];
    unplacedCount: number;
    birthdays: MemberBirthday[];
    moment?: HistoryEvent | null;
};

export default function Map({
    points,
    unplacedCount,
    birthdays,
    moment,
}: Props) {
    const places = useMemo(() => groupPlaces(points), [points]);

    const lastTriggerRef = useRef<HTMLElement | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    // The sheet reads the moment from `moment`, so reactions and comments show as they land.
    // The copy is for while it closes.
    const [openedCopy, setOpenedCopy] = useState<HistoryEvent | null>(null);
    const selected =
        (openId !== null && moment?.id === openId ? moment : null) ??
        openedCopy;

    const show = (event: HistoryEvent) => {
        setOpenId(event.id);
        setOpenedCopy(event);
        setSheetOpen(true);
    };

    useMomentFromUrl(moment, [], show);

    // The page holds only map points, so the whole moment comes from the server first. The URL
    // stays put: the sheet adds `?moment=` itself, so back closes it.
    const openMoment = (id: number, trigger: HTMLElement | null) => {
        lastTriggerRef.current = trigger;
        router.reload({
            ...MOMENT_ONLY,
            data: { moment: id },
            preserveUrl: true,
            ...mutationOptions({
                component: 'History/Map',
                action: 'moment.open',
                message: "Couldn't open that moment. Try again.",
            }),
            onSuccess: (page) => {
                const fetched = page.props.moment as HistoryEvent | null;

                if (fetched?.id === id) {
                    show(fetched);
                }
            },
        });
    };

    return (
        <HistoryLayout
            activeTab="map"
            count={
                points.length > 0 && (
                    <span className="font-sans text-(length:--text-body) text-(--history-ink-soft)">
                        {count(points.length, 'moment')} in{' '}
                        {count(places.length, 'place')}
                    </span>
                )
            }
        >
            {points.length === 0 ? (
                <EmptyState
                    icon={MapPin}
                    title="No places yet"
                    body="Give a moment a place by picking a suggestion in its Location field, and it shows up here."
                />
            ) : (
                <>
                    <MomentMap places={places} onOpen={openMoment} />

                    <ul className="history-map-places" aria-label="Places">
                        {places.map((place) => (
                            <li key={place.key}>
                                <PlaceButton
                                    place={place}
                                    onOpen={openMoment}
                                    className="history-map-place shell-press"
                                >
                                    <MapPin
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={1.5}
                                        className="history-map-place-icon"
                                    />
                                    <span className="history-map-place-text">
                                        <span className="history-map-place-name">
                                            {place.label}
                                        </span>
                                        <span className="history-map-place-sub">
                                            {place.moments.length === 1
                                                ? momentLabel(place.moments[0])
                                                : count(
                                                      place.moments.length,
                                                      'moment',
                                                  )}
                                        </span>
                                    </span>
                                </PlaceButton>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {unplacedCount > 0 && (
                <p className="history-map-unplaced">
                    {unplacedCount === 1
                        ? "1 moment has a place that was typed in, so it isn't on the map."
                        : `${unplacedCount} moments have places that were typed in, so they aren't on the map.`}{' '}
                    Edit one and pick a suggestion to place it.
                </p>
            )}

            <EventSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                mode="read"
                editingEvent={selected}
                triggerRef={lastTriggerRef}
                birthdays={birthdays}
            />
        </HistoryLayout>
    );
}
