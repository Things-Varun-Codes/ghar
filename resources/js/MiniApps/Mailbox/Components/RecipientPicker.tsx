import EmptyState from '@/Shell/Components/EmptyState';

export type HouseholdMember = { id: number; name: string };

export function defaultRecipientIds(members: HouseholdMember[]): number[] {
    return members.length === 1 ? [members[0].id] : [];
}

type Props = {
    members: HouseholdMember[];
    value: number[];
    onChange: (ids: number[]) => void;
    errors?: Record<string, string | undefined>;
    legend?: string;
};

export default function RecipientPicker({
    members,
    value,
    onChange,
    errors = {},
    legend = 'Send to',
}: Props) {
    const error = Object.entries(errors).find(([key]) =>
        key.startsWith('recipient_ids'),
    )?.[1];

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
        <fieldset className="mailbox-recipients">
            <legend className="mailbox-recipients-legend">{legend}</legend>

            {members.length === 1 ? (
                <p className="mailbox-recipient-solo">{members[0].name}</p>
            ) : (
                <div className="mailbox-recipient-list">
                    {members.map((member) => (
                        <label
                            key={member.id}
                            className="mailbox-recipient-chip"
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={value.includes(member.id)}
                                onChange={() => toggle(member.id)}
                            />
                            {member.name}
                        </label>
                    ))}
                </div>
            )}

            {error && (
                <p role="alert" className="mailbox-recipients-error">
                    {error}
                </p>
            )}
        </fieldset>
    );
}
