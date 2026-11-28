import { AvatarGroup } from '@/components/ui/avatar';
import { count } from '@/lib/plural';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

const SHOWN = 5;

/* Who shares a group: a few faces, then how many people that is. */
export default function ExpenseFaces({
    people,
    total = people.length,
}: {
    people: Person[];
    /* How many are in it, when some of them (former members) have no face to show. */
    total?: number;
}) {
    return (
        <span className="mailbox-expense-faces">
            <AvatarGroup aria-hidden="true">
                {people.slice(0, SHOWN).map((person) => (
                    <PersonAvatar key={person.id} person={person} size={24} />
                ))}
            </AvatarGroup>
            {count(total, 'person', 'people')}
        </span>
    );
}
