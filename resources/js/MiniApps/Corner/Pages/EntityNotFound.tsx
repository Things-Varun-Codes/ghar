import { Head, Link } from '@inertiajs/react';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { landing } from '@/routes/apps/our-corner';
import AppLayout from '@/Shell/Layouts/AppLayout';

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
        <AppLayout>
            <Head title="No longer here" />
            <CornerLayout>
                <div className="corner-not-found">
                    <article className="corner-not-found-card">
                        <h1 className="corner-not-found-title">
                            This {label} isn't here anymore.
                        </h1>
                        <p className="mb-6 text-[15px] opacity-[0.75]">
                            Someone may have removed it. The link still has the
                            title, but the item itself is gone.
                        </p>
                        <Link
                            href={landing.url()}
                            className="corner-not-found-back"
                        >
                            ← Back to Our Corner
                        </Link>
                    </article>
                </div>
            </CornerLayout>
        </AppLayout>
    );
}
