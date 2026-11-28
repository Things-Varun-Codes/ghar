import { FieldError, FieldLegend, FieldSet } from '@/components/ui/field';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

type Props = {
    legend: string;
    /* The radios' shared name. */
    name: string;
    people: Person[];
    value: number;
    onChange: (id: number) => void;
    /* Reads as "You" for this person. */
    viewerId?: number;
    error?: string;
};

/* One person out of a few, by face: native radios in a fieldset, drawn like RecipientPicker's chips. */
export default function PersonChoice({
    legend,
    name,
    people,
    value,
    onChange,
    viewerId,
    error,
}: Props) {
    const errorId = `${name}-error`;

    return (
        <FieldSet
            className="mailbox-recipients gap-0"
            aria-describedby={error ? errorId : undefined}
        >
            <FieldLegend className="mailbox-recipients-legend">
                {legend}
            </FieldLegend>
            <div className="mailbox-recipient-list">
                {people.map((person) => (
                    <label
                        key={person.id}
                        className="mailbox-recipient-chip shell-press"
                    >
                        <input
                            type="radio"
                            name={name}
                            className="sr-only"
                            checked={value === person.id}
                            onChange={() => onChange(person.id)}
                        />
                        <PersonAvatar person={person} size={24} />
                        {person.id === viewerId ? 'You' : person.name}
                    </label>
                ))}
            </div>
            {error && (
                <FieldError id={errorId} className="mailbox-recipients-error">
                    {error}
                </FieldError>
            )}
        </FieldSet>
    );
}
