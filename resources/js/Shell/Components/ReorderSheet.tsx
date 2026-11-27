import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { ReorderList, ReorderRow } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { mutationOptions } from '@/lib/mutation';
import FormSheet from '@/Shell/Components/FormSheet';
import SubmitButton from '@/Shell/Components/SubmitButton';

export type ReorderItem = {
    id: number;
    label: string;
    icon?: ReactNode;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    items: ReorderItem[];
    /* Takes `{ ids }`, every id in the new order, as a PUT. */
    url: string;
    /* For error reports. */
    component: string;
};

export function moveItem<T>(items: T[], from: number, to: number): T[] {
    if (to < 0 || to >= items.length || from === to) {
        return items;
    }

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    return next;
}

/*
 * One person's order of a room's things (the server keeps it theirs: PersonalOrder). Drag a
 * row by its grip, or use its arrows (keyboard and switch users). Nothing is saved until
 * Save, so a slip costs nothing.
 */
export default function ReorderSheet({
    open,
    onOpenChange,
    title,
    description,
    items,
    url,
    component,
}: Props) {
    const [order, setOrder] = useState(items);
    const [pending, setPending] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const isDirty = order.some((item, i) => item.id !== items[i]?.id);

    const move = (from: number, to: number) => {
        const next = moveItem(order, from, to);

        if (next === order) {
            return;
        }

        setOrder(next);
        setAnnouncement(
            `${order[from].label} moved to ${to + 1} of ${order.length}.`,
        );
    };

    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!isDirty) {
            onOpenChange(false);

            return;
        }

        router.put(
            url,
            { ids: order.map((item) => item.id) },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component,
                    action: 'reorder',
                    onPendingChange: setPending,
                }),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            isDirty={isDirty}
            onDiscard={() => setOrder(items)}
            onSubmit={save}
            discardTitle="Keep the old order?"
            discardDescription="The new order won't be saved."
            footer={
                <SubmitButton processing={pending} busyText="Saving…">
                    Save order
                </SubmitButton>
            }
        >
            <p className="shell-reorder-hint">
                Drag by the handle, or use the arrows. Only you see this order.
            </p>
            {/* The drawer's own swipe-to-close would take the drag otherwise. */}
            <div data-base-ui-swipe-ignore="">
                <ReorderList
                    values={order}
                    onReorder={setOrder}
                    className="shell-reorder-list"
                >
                    {order.map((item, i) => (
                        <ReorderRow
                            key={item.id}
                            value={item}
                            className="shell-reorder-row"
                        >
                            {(startDrag) => (
                                <>
                                    <span
                                        className="shell-reorder-grip"
                                        onPointerDown={startDrag}
                                        aria-hidden="true"
                                    >
                                        <GripVertical size={18} />
                                    </span>
                                    {item.icon && (
                                        <span className="shell-reorder-icon">
                                            {item.icon}
                                        </span>
                                    )}
                                    <span className="shell-reorder-label">
                                        {item.label}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shell-reorder-arrow"
                                        aria-label={`Move ${item.label} up`}
                                        aria-disabled={i === 0}
                                        onClick={() => move(i, i - 1)}
                                    >
                                        <ArrowUp size={18} aria-hidden="true" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shell-reorder-arrow"
                                        aria-label={`Move ${item.label} down`}
                                        aria-disabled={i === order.length - 1}
                                        onClick={() => move(i, i + 1)}
                                    >
                                        <ArrowDown
                                            size={18}
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </>
                            )}
                        </ReorderRow>
                    ))}
                </ReorderList>
            </div>
            <p className="sr-only" aria-live="polite">
                {announcement}
            </p>
        </FormSheet>
    );
}
