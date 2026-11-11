import { Head } from '@inertiajs/react';
import { useState } from 'react';
import ListItemCard from '@/MiniApps/Corner/Components/ListItemCard';
import ListPage from '@/MiniApps/Corner/Components/ListPage';
import PlaceAddDialog from '@/MiniApps/Corner/Components/PlaceAddDialog';
import type { ItemPermissions } from '@/MiniApps/Corner/Hooks/useItemActions';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { show } from '@/routes/apps/our-corner/places';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';
import type { Paginated } from '@/types/paginated';

const PlaceIcon = entityIcon('corner.place');

type PlaceItem = {
    id: number;
    title: string;
    place_id: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    added_at: string;
    done_at: string | null;
    is_visited: boolean;
    is_done: boolean;
    can: ItemPermissions;
    added_by_user_id: number;
    addedBy: { id: number; name: string };
};

type Props = {
    places: Paginated<PlaceItem> & {
        counts: { all: number; active: number; done: number };
    };
    filter: 'all' | 'active' | 'done';
    sort: 'recent' | 'title';
    q: string | null;
};

export default function PlacesIndex({ places, filter, sort, q }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editPlace, setEditPlace] = useState<PlaceItem | null>(null);

    return (
        <AppLayout>
            <Head title="Places" />
            <CornerLayout>
                <ListPage<PlaceItem>
                    title="Places"
                    paginator={places}
                    propName="places"
                    counts={places.counts}
                    filter={filter}
                    activeLabel="Wishlist"
                    doneLabel="Visited"
                    addCtaLabel="Add a place"
                    onOpenAddDialog={() => setAddOpen(true)}
                    query={q ?? ''}
                    searchPlaceholder="Search places"
                    sort={sort}
                    sortItems={[
                        { key: 'recent', label: 'Recently added' },
                        { key: 'title', label: 'Title A–Z' },
                    ]}
                    renderItem={(place) => (
                        <ListItemCard<PlaceItem>
                            listType="places"
                            item={place}
                            can={place.can}
                            onEdit={
                                place.can.update
                                    ? () => setEditPlace(place)
                                    : undefined
                            }
                            renderMain={() => {
                                const isDone = place.done_at !== null;
                                const detailHref = show.url(place.id);

                                return (
                                    <a
                                        href={detailHref}
                                        className="shell-card-link flex items-start gap-3 text-inherit no-underline"
                                    >
                                        <PlaceIcon
                                            aria-hidden="true"
                                            size={18}
                                            strokeWidth={1.5}
                                            color="var(--corner-accent-text, var(--corner-ink))"
                                            className="mt-0.5 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <span className="corner-row-title">
                                                {place.title}
                                                {isDone && (
                                                    <span className="corner-sticker corner-sticker--inline">
                                                        Been there
                                                    </span>
                                                )}
                                            </span>
                                            {place.address && (
                                                <p className="corner-place-address">
                                                    {place.address}
                                                </p>
                                            )}
                                            <p className="mx-0 mt-1 mb-0 text-[12px] text-[var(--corner-ink-soft,var(--corner-ink))]">
                                                Added by {place.addedBy.name}
                                            </p>
                                        </div>
                                    </a>
                                );
                            }}
                        />
                    )}
                    emptyState={{
                        all: (
                            <EmptyState
                                title="No places yet."
                                body="Add somewhere you'd like to go."
                            />
                        ),
                        active: (
                            <EmptyState
                                title="All visited."
                                body="Nothing left on the wishlist."
                            />
                        ),
                        done: (
                            <EmptyState
                                title="Nothing visited yet."
                                body="Mark a place once you've been."
                            />
                        ),
                    }}
                />

                <PlaceAddDialog open={addOpen} onOpenChange={setAddOpen} />

                {editPlace && (
                    <PlaceAddDialog
                        key={editPlace.id}
                        item={{
                            id: editPlace.id,
                            title: editPlace.title,
                            place_id: editPlace.place_id,
                            lat: editPlace.lat,
                            lng: editPlace.lng,
                            address: editPlace.address,
                        }}
                        open
                        onOpenChange={(next) => {
                            if (!next) {
                                setEditPlace(null);
                            }
                        }}
                    />
                )}
            </CornerLayout>
        </AppLayout>
    );
}
