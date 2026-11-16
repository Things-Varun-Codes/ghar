import { useState } from 'react';

import { cn } from '@/lib/utils';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';

type Props = {
    pictureUrl: string | null;
    /* The list's icon: what an item without a picture, or whose picture fails, shows. */
    icon: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const ICON_SIZE = { sm: 22, md: 28, lg: 56 } as const;

/*
 * An item's picture, or its list's icon on the room's accent wash. The box is sized before the
 * picture arrives, so nothing moves when it does.
 */
export default function ItemThumb({
    pictureUrl,
    icon,
    size = 'md',
    className,
}: Props) {
    const [broken, setBroken] = useState<string | null>(null);
    const showPicture = pictureUrl !== null && broken !== pictureUrl;

    return (
        <span
            className={cn('corner-thumb', `corner-thumb--${size}`, className)}
            aria-hidden="true"
        >
            {showPicture ? (
                <img
                    src={pictureUrl}
                    alt=""
                    loading={size === 'lg' ? 'eager' : 'lazy'}
                    decoding="async"
                    className="corner-thumb-picture"
                    onError={() => setBroken(pictureUrl)}
                />
            ) : (
                <ListIcon
                    name={icon}
                    size={ICON_SIZE[size]}
                    strokeWidth={1.5}
                    className="corner-thumb-icon"
                />
            )}
        </span>
    );
}
