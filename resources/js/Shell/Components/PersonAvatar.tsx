import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import type { Person } from '@/types/person';

export type PersonAvatarSize = 20 | 24 | 32 | 44 | 96;

/* The box is sized before the picture loads, so nothing shifts when it arrives. */
const SIZE: Record<PersonAvatarSize, string> = {
    20: 'size-5 text-[13px]',
    24: 'size-6 text-[13px]',
    32: 'size-8 text-[13px]',
    44: 'size-11 text-(length:--text-small)',
    96: 'size-24 text-(length:--text-title) font-display',
};

type Props = {
    person: Pick<Person, 'name' | 'avatar_url'>;
    size?: PersonAvatarSize;
    /*
     * Beside a printed name the face is decoration (the default). Set false where the face
     * stands alone, and it is announced by the person's name.
     */
    decorative?: boolean;
    className?: string;
};

/*
 * Someone's picture, or their initials on the accent wash. Never a link and never the only way
 * to tell who it is. The 20 and 24px sizes show one initial: two wouldn't fit at 13px.
 */
export default function PersonAvatar({
    person,
    size = 32,
    decorative = true,
    className,
}: Props) {
    const letters = size <= 24 ? 1 : 2;

    return (
        <Avatar
            data-size={size}
            className={cn('shell-avatar', SIZE[size], className)}
            aria-hidden={decorative || undefined}
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : person.name}
        >
            {person.avatar_url && (
                <AvatarImage src={person.avatar_url} alt="" />
            )}
            <AvatarFallback className="shell-avatar-initials">
                {initials(person.name, letters)}
            </AvatarFallback>
        </Avatar>
    );
}
