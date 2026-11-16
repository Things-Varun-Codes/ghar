import { CheckCircle2, Circle } from 'lucide-react';

import type { DoneIcon } from '@/MiniApps/Corner/lib/types';
import HeartMark from '@/Shell/Components/HeartMark';

/* The glyph on a done toggle: a heart or a check, filled once it's done. */
export function DoneGlyph({
    icon,
    done,
    size,
}: {
    icon: DoneIcon;
    done: boolean;
    size?: number;
}) {
    if (icon === 'heart') {
        return <HeartMark size={size} filled={done} />;
    }

    const Glyph = done ? CheckCircle2 : Circle;

    return <Glyph aria-hidden="true" size={size} strokeWidth={1.5} />;
}

/* Done is never crossed out: it earns a sticker in the list's own word. */
export function DoneSticker({
    icon,
    label,
    inline = false,
}: {
    icon: DoneIcon;
    label: string;
    inline?: boolean;
}) {
    return (
        <span
            className={
                inline
                    ? 'corner-sticker corner-sticker--inline'
                    : 'corner-sticker'
            }
        >
            {icon === 'heart' && <HeartMark size={12} filled />}
            {label}
        </span>
    );
}
