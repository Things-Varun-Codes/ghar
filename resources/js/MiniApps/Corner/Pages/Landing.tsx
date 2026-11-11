import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { index as activities } from '@/routes/apps/our-corner/activities';
import { index as movies } from '@/routes/apps/our-corner/movies';
import { index as places } from '@/routes/apps/our-corner/places';
import { index as songs } from '@/routes/apps/our-corner/songs';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';
import { entityIcon } from '@/Shell/linkables/entityIcon';

type Counts = {
    songs: number;
    movies: number;
    activities: number;
    places: number;
};

type Peek = { images?: string[]; title?: string | null };

type CornerSummaryShared = {
    counts: Counts;
    peeks?: Partial<Record<keyof Counts, Peek>>;
};

type Props = {
    cornerSummary?: CornerSummaryShared | null;
};

type ListCard = {
    slug: 'songs' | 'movies' | 'activities' | 'places';
    label: string;
    href: string;
    Icon: LucideIcon;
    // Both plural forms are written out: a trailing-s rule can't handle irregulars.
    singularNoun: string;
    pluralNoun: string;
};

const LIST_CARDS: readonly ListCard[] = [
    {
        slug: 'songs',
        label: 'Songs',
        href: songs.url(),
        Icon: entityIcon('corner.song'),
        singularNoun: 'song',
        pluralNoun: 'songs',
    },
    {
        slug: 'movies',
        label: 'Movies',
        href: movies.url(),
        Icon: entityIcon('corner.movie'),
        singularNoun: 'movie',
        pluralNoun: 'movies',
    },
    {
        slug: 'activities',
        label: 'Activities',
        href: activities.url(),
        Icon: entityIcon('corner.activity'),
        singularNoun: 'activity',
        pluralNoun: 'activities',
    },
    {
        slug: 'places',
        label: 'Places',
        href: places.url(),
        Icon: entityIcon('corner.place'),
        singularNoun: 'place',
        pluralNoun: 'places',
    },
];

const EMPTY_COUNTS: Counts = {
    songs: 0,
    movies: 0,
    activities: 0,
    places: 0,
};

function CardPeek({ peek, Icon }: { peek?: Peek; Icon: LucideIcon }) {
    const images = peek?.images ?? [];

    if (images.length > 0) {
        return (
            <span className="corner-landing-peek" aria-hidden="true">
                {images.map((src) => (
                    <img key={src} src={src} alt="" loading="lazy" />
                ))}
            </span>
        );
    }

    return (
        <span
            className="corner-landing-peek corner-landing-peek--text"
            aria-hidden="true"
        >
            {peek?.title ?? (
                <Icon
                    size={28}
                    strokeWidth={1.5}
                    className="corner-landing-icon"
                />
            )}
        </span>
    );
}

export default function Landing({ cornerSummary }: Props) {
    const counts = cornerSummary?.counts ?? EMPTY_COUNTS;

    return (
        <AppLayout>
            <Head title="Our Corner" />
            <CornerLayout>
                <Page tier="index" title="Our Corner" backChevron>
                    <div className="corner-landing-stack">
                        <div className="corner-landing-grid">
                            {LIST_CARDS.map((card) => (
                                <Link
                                    key={card.slug}
                                    href={card.href}
                                    aria-label={`Open ${card.label}`}
                                    className="corner-card corner-landing-card"
                                >
                                    <CardPeek
                                        peek={cornerSummary?.peeks?.[card.slug]}
                                        Icon={card.Icon}
                                    />
                                    <span className="corner-landing-label">
                                        {card.label}
                                    </span>
                                    <span className="corner-landing-count">
                                        {counts[card.slug]}{' '}
                                        {counts[card.slug] === 1
                                            ? card.singularNoun
                                            : card.pluralNoun}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </Page>
            </CornerLayout>
        </AppLayout>
    );
}
