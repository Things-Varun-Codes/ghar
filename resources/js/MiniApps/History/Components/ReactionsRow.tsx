import { router } from '@inertiajs/react';
import { useId, useState } from 'react';
import { Pop } from '@/components/motion';
import { Toggle } from '@/components/ui/toggle';
import { region } from '@/lib/dates';
import { mutationOptions } from '@/lib/mutation';
import { MOMENT_ONLY } from '@/MiniApps/History/lib/momentVisit';
import type {
    EventReactionSummary,
    HistoryEvent,
    ReactionKey,
} from '@/MiniApps/History/lib/types';
import reactions from '@/routes/apps/our-history/events/reactions';
import PersonAvatar from '@/Shell/Components/PersonAvatar';

/* What each glyph is called aloud; screen readers name emoji unevenly. */
const SPOKEN: Record<ReactionKey, string> = {
    heart: 'Love',
    laugh: 'Laughing',
    wow: 'Wow',
    sad: 'Sad',
    pray: 'Grateful',
    party: 'Celebrate',
};

export function namesOf(reaction: EventReactionSummary): string {
    return new Intl.ListFormat(region().locale, {
        style: 'long',
        type: 'conjunction',
    }).format(reaction.people.map((p) => p.name));
}

type Props = {
    event: HistoryEvent;
};

export default function ReactionsRow({ event }: Props) {
    const [pending, setPending] = useState<ReactionKey | null>(null);
    const baseId = useId();
    const used = event.reactions.filter((r) => r.count > 0);

    const toggle = (reaction: EventReactionSummary) => {
        // Kept focusable while it's on its way, so a keyboard user isn't dropped to the page.
        if (pending !== null) {
            return;
        }

        const args = { event: event.id, reaction: reaction.key };
        const options = {
            ...MOMENT_ONLY,
            ...mutationOptions({
                component: 'History/ReactionsRow',
                action: reaction.mine ? 'reaction.remove' : 'reaction.add',
                onPendingChange: (isPending) =>
                    setPending(isPending ? reaction.key : null),
            }),
        };

        if (reaction.mine) {
            router.delete(reactions.destroy(args).url, options);
        } else {
            router.put(reactions.update(args).url, {}, options);
        }
    };

    return (
        <section className="history-reactions" aria-label="Reactions">
            <div className="history-reaction-row">
                {event.reactions.map((reaction) => (
                    <Toggle
                        key={reaction.key}
                        pressed={reaction.mine}
                        onPressedChange={() => toggle(reaction)}
                        aria-describedby={
                            reaction.count > 0
                                ? `${baseId}-${reaction.key}`
                                : undefined
                        }
                        aria-busy={pending === reaction.key || undefined}
                        data-pending={pending === reaction.key || undefined}
                        className="history-reaction"
                    >
                        <span
                            aria-hidden="true"
                            className="history-reaction-glyph"
                        >
                            {reaction.emoji}
                        </span>
                        <span className="sr-only">{SPOKEN[reaction.key]}</span>
                        <Pop
                            show={reaction.count > 0}
                            changeKey={reaction.count}
                            className="history-reaction-count"
                        >
                            {reaction.count}
                        </Pop>
                    </Toggle>
                ))}
            </div>

            {used.length > 0 && (
                <ul className="history-reaction-people">
                    {used.map((reaction) => (
                        <li
                            key={reaction.key}
                            id={`${baseId}-${reaction.key}`}
                            className="history-reaction-people-row"
                        >
                            <span
                                aria-hidden="true"
                                className="history-reaction-emoji"
                            >
                                {reaction.emoji}
                            </span>
                            <span className="sr-only">
                                {SPOKEN[reaction.key]}:
                            </span>
                            <span
                                className="history-reaction-faces"
                                aria-hidden="true"
                            >
                                {reaction.people.map((person) => (
                                    <PersonAvatar
                                        key={person.id}
                                        person={person}
                                        size={20}
                                    />
                                ))}
                            </span>
                            <span>{namesOf(reaction)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
