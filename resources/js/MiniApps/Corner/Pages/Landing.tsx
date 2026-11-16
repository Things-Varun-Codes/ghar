import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as activities } from '@/routes/apps/our-corner/activities';
import { index as movies } from '@/routes/apps/our-corner/movies';
import { index as places } from '@/routes/apps/our-corner/places';
import { index as songs } from '@/routes/apps/our-corner/songs';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';

type Slug = 'songs' | 'movies' | 'activities' | 'places';

type Tally = Record<Slug, number>;

type Peeks = {
    songs: { images: string[] };
    movies: { images: string[] };
    activities: { items: { title: string; done: boolean }[] };
    places: { title: string; address: string | null } | null;
};

type CornerSummaryShared = {
    counts: Tally;
    done?: Tally;
    peeks?: Peeks;
};

type Props = {
    cornerSummary?: CornerSummaryShared | null;
};

type Door = {
    slug: Slug;
    label: string;
    href: string;
    Icon: LucideIcon;
    // Both plural forms are written out: a trailing-s rule can't handle irregulars.
    singularNoun: string;
    pluralNoun: string;
    doneWord: string;
};

const DOORS: readonly Door[] = [
    {
        slug: 'songs',
        label: 'Songs',
        href: songs.url(),
        Icon: entityIcon('corner.song'),
        singularNoun: 'song',
        pluralNoun: 'songs',
        doneWord: 'loved',
    },
    {
        slug: 'movies',
        label: 'Movies',
        href: movies.url(),
        Icon: entityIcon('corner.movie'),
        singularNoun: 'movie',
        pluralNoun: 'movies',
        doneWord: 'watched',
    },
    {
        slug: 'activities',
        label: 'Activities',
        href: activities.url(),
        Icon: entityIcon('corner.activity'),
        singularNoun: 'activity',
        pluralNoun: 'activities',
        doneWord: 'done',
    },
    {
        slug: 'places',
        label: 'Places',
        href: places.url(),
        Icon: entityIcon('corner.place'),
        singularNoun: 'place',
        pluralNoun: 'places',
        doneWord: 'visited',
    },
];

/** Empty frames on the shelf: an empty list still reads as a place for things. */
const EMPTY_FRAMES = 3;

function liveLine(door: Door, count: number, done: number): string {
    if (count === 0) {
        return `No ${door.pluralNoun} yet`;
    }

    const total = `${count} ${count === 1 ? door.singularNoun : door.pluralNoun}`;

    return done > 0 ? `${total} · ${done} ${door.doneWord}` : total;
}

function Shelf({
    images,
    frame,
    Icon,
}: {
    images: string[];
    frame: 'cd' | 'poster';
    Icon: LucideIcon;
}) {
    const frameClass = frame === 'cd' ? 'corner-cd' : 'corner-poster';
    const coverClass =
        frame === 'cd' ? 'corner-cd-cover' : 'corner-poster-cover';
    const fallbackClass =
        frame === 'cd' ? 'corner-cd-fallback' : 'corner-poster-fallback';

    return (
        <span className="corner-door-shelf">
            {images.length > 0
                ? images.map((src) => (
                      <span key={src} className={frameClass}>
                          <img
                              src={src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={coverClass}
                          />
                      </span>
                  ))
                : Array.from({ length: EMPTY_FRAMES }, (_, i) => (
                      <span
                          key={i}
                          className={`${frameClass} corner-door-frame--empty`}
                      >
                          <span className={fallbackClass}>
                              <Icon size={22} strokeWidth={1.5} />
                          </span>
                      </span>
                  ))}
        </span>
    );
}

function DoorPeek({ door, peeks }: { door: Door; peeks?: Peeks }) {
    const { Icon } = door;

    switch (door.slug) {
        case 'songs':
            return (
                <Shelf
                    images={peeks?.songs.images ?? []}
                    frame="cd"
                    Icon={Icon}
                />
            );
        case 'movies':
            return (
                <Shelf
                    images={peeks?.movies.images ?? []}
                    frame="poster"
                    Icon={Icon}
                />
            );
        case 'activities': {
            const items = peeks?.activities.items ?? [];

            return items.length > 0 ? (
                <ul className="corner-door-scrap">
                    {items.map((item, i) => (
                        <li key={`${i}-${item.title}`}>
                            <span className="corner-door-scrap-title">
                                {item.title}
                            </span>
                            {item.done && (
                                <span className="corner-sticker corner-sticker--inline">
                                    Done
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <span className="corner-door-empty">
                    <Icon size={28} strokeWidth={1.5} />
                </span>
            );
        }
        case 'places': {
            const place = peeks?.places ?? null;

            return (
                <span className="corner-door-pin">
                    <Icon
                        size={28}
                        strokeWidth={1.5}
                        className="corner-door-pin-icon"
                    />
                    {place && (
                        <span className="corner-door-pin-text">
                            <span className="corner-door-pin-title">
                                {place.title}
                            </span>
                            {place.address && (
                                <span className="corner-door-pin-address">
                                    {place.address}
                                </span>
                            )}
                        </span>
                    )}
                </span>
            );
        }
    }
}

function CornerDoor({
    door,
    count,
    done,
    peeks,
}: {
    door: Door;
    count: number;
    done: number;
    peeks?: Peeks;
}) {
    const liveId = useId();

    return (
        <article className="corner-card corner-door shell-card-stretch">
            <div className="corner-door-peek" aria-hidden="true">
                <DoorPeek door={door} peeks={peeks} />
            </div>
            <h2 className="corner-door-name">
                <Link
                    href={door.href}
                    prefetch="mount"
                    aria-describedby={liveId}
                    className="shell-card-link"
                >
                    {door.label}
                </Link>
            </h2>
            <p id={liveId} className="corner-door-live">
                {liveLine(door, count, done)}
            </p>
        </article>
    );
}

export default function Landing({ cornerSummary }: Props) {
    return (
        <AppLayout>
            <Head title="Our Corner" />
            <CornerLayout>
                <Page tier="index" title="Our Corner" backChevron>
                    <div className="corner-doors">
                        {DOORS.map((door) => (
                            <CornerDoor
                                key={door.slug}
                                door={door}
                                count={cornerSummary?.counts[door.slug] ?? 0}
                                done={cornerSummary?.done?.[door.slug] ?? 0}
                                peeks={cornerSummary?.peeks}
                            />
                        ))}
                    </div>
                </Page>
            </CornerLayout>
        </AppLayout>
    );
}
