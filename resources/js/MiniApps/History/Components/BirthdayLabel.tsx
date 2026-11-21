import { birthdayOf } from '@/MiniApps/History/lib/birthdays';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

/* "Meera's birthday", with her face, on a moment linked to a member's birthday. */
export default function BirthdayLabel({ person }: { person: Person }) {
    return (
        <span className="history-birthday-label">
            <PersonAvatar person={person} size={20} />
            <span>{birthdayOf(person)}</span>
        </span>
    );
}
