import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { pageTitle } from '@/lib/title';
import CornerLayout, {
    CORNER_ROOM,
} from '@/MiniApps/Corner/Layouts/CornerLayout';
import { landing } from '@/routes/apps/our-corner';

interface Props {
    kind: 'song' | 'movie' | 'activity' | 'place';
}

const KIND_LABEL: Record<Props['kind'], string> = {
    song: 'song',
    movie: 'movie',
    activity: 'activity',
    place: 'place',
};

export default function EntityNotFound({ kind }: Props) {
    const label = KIND_LABEL[kind] ?? 'thing';

    return (
        <>
            <Head title={pageTitle('No longer here', CORNER_ROOM)} />
            <CornerLayout>
                <div className="corner-not-found">
                    <article className="corner-not-found-card">
                        <h1 className="corner-not-found-title">
                            This {label} isn't here anymore.
                        </h1>
                        <p className="corner-not-found-body">
                            Someone may have removed it. The link still has the
                            title, but the item itself is gone.
                        </p>
                        <Link
                            href={landing.url()}
                            className="corner-not-found-back shell-press"
                        >
                            <ChevronLeft
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.5}
                            />
                            Back to {CORNER_ROOM}
                        </Link>
                    </article>
                </div>
            </CornerLayout>
        </>
    );
}
