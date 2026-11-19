import { useState } from 'react';
import { relativeTime } from '@/MiniApps/History/lib/relativeTime';
import type { EventChange } from '@/MiniApps/History/lib/types';

type ActivityStripProps = {
    changes: EventChange[];
};

export default function ActivityStrip({ changes }: ActivityStripProps) {
    const [expanded, setExpanded] = useState(false);

    if (!changes || changes.length === 0) {
        return null;
    }

    const mostRecent = changes[0];

    return (
        <div className="mt-4 border-t border-t-(--history-rule) pt-3">
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="history-activity-toggle"
                aria-expanded={expanded}
            >
                <span className="font-sans text-(length:--text-meta) text-(--history-ink-soft)">
                    {mostRecent.action === 'create' ? 'Created' : 'Edited'} by{' '}
                    <strong className="font-medium">
                        {mostRecent.user_name}
                    </strong>
                    {' · '}
                    {relativeTime(mostRecent.created_at)}
                </span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                    className="ml-auto text-(--history-ink-soft) [transition:transform_var(--dur-in)_var(--ease-ui)]"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {expanded && (
                <ul className="mx-0 mt-2 mb-0 list-none p-0">
                    {changes.map((change) => (
                        <li key={change.id} className="history-activity-row">
                            <span>
                                <strong className="font-medium">
                                    {change.user_name}
                                </strong>{' '}
                                · {change.summary}
                            </span>
                            <span className="ml-4 whitespace-nowrap">
                                {relativeTime(change.created_at)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
