import { Link } from '@inertiajs/react';
import { Ban } from 'lucide-react';
import { useState } from 'react';

export type MentionedInRef = {
    from_type: string;
    from_id: number;
    snapshot: {
        id?: number;
        title?: string;
        thumbnail_url?: string | null;
        deep_link_url?: string | null;
    } | null;
};

type Props = {
    mentionedIn: MentionedInRef[];
};

export default function MentionedInList({ mentionedIn }: Props) {
    const [showMissing, setShowMissing] = useState(false);

    const resolved = mentionedIn.filter((r) => r.snapshot !== null);
    const missing = mentionedIn.filter((r) => r.snapshot === null);

    return (
        <aside
            className="backref-sidebar"
            aria-labelledby="corner-backref-heading"
        >
            <h2
                id="corner-backref-heading"
                className="corner-hand-meta corner-backref-heading"
            >
                Mentioned in
            </h2>

            {resolved.length === 0 && missing.length === 0 && (
                <p className="corner-hand-meta corner-backref-empty">
                    No moments mention this yet.
                </p>
            )}

            {resolved.length > 0 && (
                <ul className="mx-0 mt-0 mb-3 flex list-none flex-col gap-2 p-0">
                    {resolved.map((ref) => {
                        const snap = ref.snapshot!;
                        const title = snap.title ?? 'Untitled';
                        const content = (
                            <>
                                {snap.thumbnail_url && (
                                    <img
                                        src={snap.thumbnail_url}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        className="corner-backref-thumb"
                                    />
                                )}
                                <span className="flex min-w-0 flex-col">
                                    <span className="corner-backref-title">
                                        {title}
                                    </span>
                                    <span className="corner-hand-meta corner-backref-source">
                                        from Our History
                                    </span>
                                </span>
                            </>
                        );

                        return (
                            <li key={`${ref.from_type}-${ref.from_id}`}>
                                {snap.deep_link_url ? (
                                    <Link
                                        className="backref-card corner-backref-link"
                                        href={snap.deep_link_url}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div className="backref-card corner-backref-link">
                                        {content}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {missing.length > 0 && (
                <div className="missing-banner-wrapper">
                    {!showMissing ? (
                        <button
                            type="button"
                            className="missing-banner corner-backref-missing-toggle"
                            onClick={() => setShowMissing(true)}
                        >
                            <Ban
                                aria-hidden="true"
                                size={16}
                                strokeWidth={1.5}
                                className="mr-1 inline-block align-[-3px]"
                            />
                            {missing.length}{' '}
                            {missing.length === 1
                                ? 'reference points'
                                : 'references point'}{' '}
                            to an event that's been removed.{' '}
                            <span className="underline">Show anyway</span>
                        </button>
                    ) : (
                        <ul className="mx-0 mt-2 mb-0 flex list-none flex-col gap-2 p-0">
                            {missing.map((ref) => (
                                <li
                                    key={`${ref.from_type}-${ref.from_id}`}
                                    className="backref-card corner-backref-removed"
                                    aria-disabled="true"
                                >
                                    <span className="corner-hand-meta corner-backref-source">
                                        Removed{' '}
                                        {ref.from_type
                                            .replace('history.', '')
                                            .replace('corner.', '')}{' '}
                                        #{ref.from_id}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </aside>
    );
}
