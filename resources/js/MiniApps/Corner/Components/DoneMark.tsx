import { CheckCircle2, Circle } from 'lucide-react';

import { Pop } from '@/components/motion';
import type { DoneIcon } from '@/MiniApps/Corner/lib/types';
import HeartMark from '@/Shell/Components/HeartMark';

/*
 * The glyph on a done toggle: a heart or a check, filled once it's done. It scales in when
 * the state changes, never as the page loads.
 */
export function DoneGlyph({
    icon,
    done,
    size,
}: {
    icon: DoneIcon;
    done: boolean;
    size?: number;
}) {
    const Glyph = done ? CheckCircle2 : Circle;

    return (
        <Pop changeKey={done ? 'done' : 'todo'} className="inline-flex">
            {icon === 'heart' ? (
                <HeartMark size={size} filled={done} />
            ) : (
                <Glyph aria-hidden="true" size={size} strokeWidth={1.5} />
            )}
        </Pop>
    );
}

/*
 * Done is never crossed out: it earns a sticker in the list's own word. Where it can be
 * marked in place, `animated` scales the sticker in when it is; the motion is on a wrapper,
 * so the tilt never moves.
 */
export function DoneSticker({
    icon,
    label,
    show = true,
    animated = false,
}: {
    icon: DoneIcon;
    label: string;
    show?: boolean;
    animated?: boolean;
}) {
    const sticker = (
        <span className="corner-sticker">
            {icon === 'heart' && <HeartMark size={12} filled />}
            {label}
        </span>
    );

    if (!animated) {
        return show ? sticker : null;
    }

    return (
        <Pop show={show} className="inline-flex">
            {sticker}
        </Pop>
    );
}
