import { useId, useState } from 'react';

import { Fade } from '@/components/motion';
import {
    FieldDescription,
    FieldError,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import EmptyState from '@/Shell/Components/EmptyState';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

export type HouseholdMember = Person;

export function defaultRecipientIds(members: HouseholdMember[]): number[] {
    return members.length === 1 ? [members[0].id] : [];
}

type Props = {
    members: HouseholdMember[];
    value: number[];
    onChange: (ids: number[]) => void;
    errors?: Record<string, string | undefined>;
    legend?: string;
    /* Reads as "You" for this person, where the viewer is among the choices. */
    viewerId?: number;
};

/*
 * Native checkboxes in a fieldset: a toggle group would announce each person as a pressed
 * button rather than a choice in a set.
 */
export default function RecipientPicker({
    members,
    value,
    onChange,
    errors = {},
    legend = 'Send to',
    viewerId,
}: Props) {
    const noteId = useId();
    const error = Object.entries(errors).find(([key]) =>
        key.startsWith('recipient_ids'),
    )?.[1];
    const showHelper = !error && members.length > 1 && value.length === 0;
    const note = error ? 'error' : showHelper ? 'helper' : null;

    // The note under the chips fades in when it changes, but not as the sheet first draws.
    const [shownNote, setShownNote] = useState(note);
    const [noteChanged, setNoteChanged] = useState(false);

    if (note !== shownNote) {
        setShownNote(note);
        setNoteChanged(true);
    }

    if (members.length === 0) {
        return (
            <EmptyState
                title="No one to send this to yet."
                body="Once someone else joins the household, you can write to them here."
            />
        );
    }

    const toggle = (id: number) => {
        onChange(
            value.includes(id)
                ? value.filter((existing) => existing !== id)
                : [...value, id],
        );
    };

    return (
        <FieldSet
            className="mailbox-recipients gap-0"
            aria-describedby={note ? noteId : undefined}
        >
            <FieldLegend className="mailbox-recipients-legend">
                {legend}
                <span aria-hidden="true" className="mailbox-required">
                    *
                </span>
            </FieldLegend>

            {members.length === 1 ? (
                <p className="mailbox-recipient-solo">
                    <PersonAvatar person={members[0]} size={24} />
                    {members[0].id === viewerId ? 'You' : members[0].name}
                </p>
            ) : (
                <div className="mailbox-recipient-list">
                    {members.map((member) => (
                        <label
                            key={member.id}
                            className="mailbox-recipient-chip shell-press"
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={value.includes(member.id)}
                                onChange={() => toggle(member.id)}
                            />
                            <PersonAvatar person={member} size={24} />
                            {member.id === viewerId ? 'You' : member.name}
                        </label>
                    ))}
                </div>
            )}

            {note && (
                <Fade key={note} appear={noteChanged}>
                    {note === 'error' ? (
                        <FieldError
                            id={noteId}
                            className="mailbox-recipients-error"
                        >
                            {error}
                        </FieldError>
                    ) : (
                        <FieldDescription
                            id={noteId}
                            className="mailbox-field-helper"
                        >
                            Choose at least one person.
                        </FieldDescription>
                    )}
                </Fade>
            )}
        </FieldSet>
    );
}
