import { motion, useScroll } from 'motion/react';
import type { ReactNode } from 'react';
import { useRef } from 'react';

type Props = {
    id?: string;
    className?: string;
    /* The fill: placed by the room's CSS, scaled down from its top as the section passes. */
    fillClassName: string;
    children: ReactNode;
};

/*
 * A section with a progress fill tied to the scroll: empty while the section's top is below the
 * middle of the screen, full once its end has passed it. It follows the scroll, it isn't timed.
 */
export default function ScrollFill({
    id,
    className,
    fillClassName,
    children,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start center', 'end center'],
    });

    return (
        <div ref={ref} id={id} className={className}>
            <motion.div
                aria-hidden="true"
                className={fillClassName}
                style={{ scaleY: scrollYProgress, transformOrigin: 'top' }}
            />
            {children}
        </div>
    );
}
