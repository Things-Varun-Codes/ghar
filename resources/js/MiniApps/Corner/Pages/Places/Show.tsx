import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import DetailPage from '@/MiniApps/Corner/Components/DetailPage';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import PlaceAddDialog from '@/MiniApps/Corner/Components/PlaceAddDialog';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import { useItemActions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as placesIndex } from '@/routes/apps/our-corner/places';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';

const PlaceIcon = entityIcon('corner.place');

type PlaceDetail = {
    id: number;
    title: string;
    place_id: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    added_at: string;
    done_at: string | null;
    is_visited: boolean;
    can: ItemPermissions;
    addedBy: { id: number; name: string };
};

type Props = {
    place: PlaceDetail;
    mentioned_in: MentionedInRef[];
};

// A plain search link needs no API key; a picked place also pins the exact listing.
function googleMapsUrl(place: PlaceDetail): string {
    const params = new URLSearchParams({
        api: '1',
        query: [place.title, place.address].filter(Boolean).join(', '),
        ...(place.place_id ? { query_place_id: place.place_id } : {}),
    });

    return `https://www.google.com/maps/search/?${params.toString()}`;
}

export default function PlacesShow({ place, mentioned_in }: Props) {
    const [editOpen, setEditOpen] = useState(false);

    const itemActions = useItemActions({
        type: 'places',
        id: place.id,
        title: place.title,
        onOpenEdit: () => setEditOpen(true),
        onDeleted: () => router.visit(placesIndex.url()),
    });

    return (
        <AppLayout>
            <Head title={place.title} />
            <CornerLayout>
                <DetailPage
                    title={place.title}
                    can={place.can}
                    addedByName={place.addedBy.name}
                    mentionedIn={mentioned_in}
                    isDone={place.is_visited}
                    doneLabel={{
                        active: 'Mark as visited',
                        done: 'Visited',
                    }}
                    itemActions={itemActions}
                    hero={() => (
                        <div className="corner-detail-place">
                            <PlaceIcon
                                aria-hidden="true"
                                size={28}
                                strokeWidth={1.5}
                                className="corner-detail-place-icon"
                            />
                            <div>
                                {place.address && (
                                    <p className="corner-detail-lede">
                                        {place.address}
                                    </p>
                                )}
                                {place.lat !== null && place.lng !== null && (
                                    <p className="corner-detail-coords">
                                        {place.lat.toFixed(5)},{' '}
                                        {place.lng.toFixed(5)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    externalCta={() => (
                        <a
                            href={googleMapsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="corner-detail-cta"
                        >
                            Open in Google Maps ↗
                        </a>
                    )}
                />

                {place.can.update && editOpen && (
                    <PlaceAddDialog
                        item={{
                            id: place.id,
                            title: place.title,
                            place_id: place.place_id,
                            lat: place.lat,
                            lng: place.lng,
                            address: place.address,
                        }}
                        open
                        onOpenChange={(next) => {
                            if (!next) {
                                setEditOpen(false);
                            }
                        }}
                    />
                )}
            </CornerLayout>
        </AppLayout>
    );
}
