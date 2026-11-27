import { Reorder, useDragControls } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { useState } from 'react';
import { DURATION, tween } from './presets';

type ListProps<T> = {
    values: T[];
    onReorder: (values: T[]) => void;
    className?: string;
    children: ReactNode;
};

/* A vertical list whose rows are dragged into a new order; the others glide out of the way. */
export function ReorderList<T>({
    values,
    onReorder,
    className,
    children,
}: ListProps<T>) {
    return (
        <Reorder.Group
            as="ul"
            axis="y"
            values={values}
            onReorder={onReorder}
            className={className}
        >
            {children}
        </Reorder.Group>
    );
}

type RowProps<T> = {
    value: T;
    className?: string;
    /* The row's content, given the handler its grip calls on pointer down. */
    children: (startDrag: (event: PointerEvent) => void) => ReactNode;
};

/* Only the grip starts a drag, so the rest of the row scrolls and takes taps as usual. */
export function ReorderRow<T>({ value, className, children }: RowProps<T>) {
    const controls = useDragControls();
    const [dragging, setDragging] = useState(false);

    return (
        <Reorder.Item
            value={value}
            dragListener={false}
            dragControls={controls}
            className={className}
            transition={{ layout: tween(DURATION.card) }}
            whileDrag={{ scale: 1.02 }}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
            data-dragging={dragging ? '' : undefined}
        >
            {children((event) => controls.start(event))}
        </Reorder.Item>
    );
}
