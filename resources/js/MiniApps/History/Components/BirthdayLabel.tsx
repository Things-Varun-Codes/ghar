import { birthdayOf } from '@/MiniApps/History/lib/birthdays';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Person } from '@/types/person';

/* "Meera's birthday", with her face, on a moment linked to a member's birthday. */
export default function BirthdayLabel({ person }: { person: Person }) {
    return (
        <p className="history-birthday-label">
            <PersonAvatar person={person} size={20} />
            <span>{birthdayOf(person)}</span>
        </p>
    );
}
