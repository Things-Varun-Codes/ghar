import type { ReactNode } from 'react';
import { useState } from 'react';

import LinkableIcon from '@/Shell/linkables/LinkableIcon';
import { thumbnailSrc } from '@/Shell/linkables/urls';

export const PILL_FALLBACK_LABEL = 'Linked item';

/*
 * The inside of a link pill: the thing's mark, its picture when there is a safe one, and its
 * title (or `label` when the caller wraps the title itself).
 */
export default function EntityPillContent({
    title,
    icon,
    thumbnail,
    thumbClassName,
    label,
}: {
    title: string;
    icon: string | null | undefined;
    /* Unchecked: only a same-origin or https picture is drawn. */
    thumbnail: string | null | undefined;
    thumbClassName: string;
    label?: ReactNode;
}) {
    const [thumbnailBroken, setThumbnailBroken] = useState(false);
    const safeThumbnail =
        thumbnail && !thumbnailBroken ? thumbnailSrc(thumbnail) : null;

    return (
        <>
            <span className="tt-pill-glyph" aria-hidden="true">
                <LinkableIcon name={icon} size={14} />
            </span>
            {safeThumbnail ? (
                <img
                    src={safeThumbnail}
                    alt=""
                    className={thumbClassName}
                    onError={() => setThumbnailBroken(true)}
                />
            ) : null}
            {label ?? (title || PILL_FALLBACK_LABEL)}
        </>
    );
}
