import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { pageTitle } from '@/lib/title';
import CornerLayout, {
    CORNER_ROOM,
} from '@/MiniApps/Corner/Layouts/CornerLayout';
import { landing } from '@/routes/apps/our-shelf';

interface Props {
    kind: 'list' | 'item';
}

export default function EntityNotFound({ kind }: Props) {
    return (
        <>
            <Head title={pageTitle('No longer here', CORNER_ROOM)} />
            <CornerLayout>
                <div className="corner-not-found">
                    <article className="corner-not-found-card">
                        <h1 className="corner-not-found-title">
                            {kind === 'list'
                                ? "This list isn't here anymore."
                                : "This isn't here anymore."}
                        </h1>
                        <p className="corner-not-found-body">
                            Someone may have removed it. An old link or
                            notification can still show its title.
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
