import { router } from '@inertiajs/react';
import { useId, useState } from 'react';

import { Switch } from '@/components/ui/switch';
import { mutationOptions } from '@/lib/mutation';
import * as roomsRoutes from '@/routes/admin/rooms';
import EmptyState from '@/Shell/Components/EmptyState';
import Page from '@/Shell/Components/Page';

type RoomOption = {
    key: string;
    label: string;
    description: string;
    enabled: boolean;
};

type Room = {
    slug: string;
    name: string;
    description: string;
    enabled: boolean;
    options: RoomOption[];
};

type Props = { rooms: Room[] };

function SwitchRow({
    label,
    description,
    checked,
    disabled,
    onChange,
    title = false,
}: {
    label: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    onChange: (next: boolean) => void;
    title?: boolean;
}) {
    const labelId = useId();
    const descriptionId = useId();

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
                {title ? (
                    <h2 id={labelId} className="os-admin-section-title">
                        {label}
                    </h2>
                ) : (
                    <p id={labelId} className="os-settings-row-label">
                        {label}
                    </p>
                )}
                {description && (
                    <p
                        id={descriptionId}
                        className="os-settings-row-status mt-1"
                    >
                        {description}
                    </p>
                )}
            </div>
            <div className="shrink-0 pt-1">
                <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={onChange}
                    aria-labelledby={labelId}
                    aria-describedby={description ? descriptionId : undefined}
                />
            </div>
        </div>
    );
}

export default function Rooms({ rooms }: Props) {
    const [pending, setPending] = useState<Set<string>>(new Set());

    const toggle = (room: Room, enabled: boolean, option?: RoomOption) => {
        const key = option ? `${room.slug}:${option.key}` : room.slug;

        if (pending.has(key)) {
            return;
        }

        router.patch(
            roomsRoutes.update.url({ room: room.slug }),
            option ? { enabled, option: option.key } : { enabled },
            {
                preserveScroll: true,
                ...mutationOptions({
                    component: 'Admin/Rooms',
                    action: option ? 'toggleOption' : 'toggleRoom',
                    onPendingChange: (isPending) =>
                        setPending((current) => {
                            const next = new Set(current);

                            if (isPending) {
                                next.add(key);
                            } else {
                                next.delete(key);
                            }

                            return next;
                        }),
                }),
            },
        );
    };

    return (
        <Page
            tier="prose"
            title="Rooms"
            subtitle="Choose which rooms this home has. Turning a room off hides it from everyone and keeps what's in it."
            room="Admin"
            backChevron
        >
            {rooms.length === 0 ? (
                <EmptyState
                    title="No rooms to choose from"
                    body="This install doesn't come with any rooms."
                />
            ) : (
                <ul className="flex flex-col gap-4">
                    {rooms.map((room) => (
                        <li
                            key={room.slug}
                            className="os-admin-surface border p-6"
                        >
                            <SwitchRow
                                title
                                label={room.name}
                                description={room.description}
                                checked={room.enabled}
                                disabled={pending.has(room.slug)}
                                onChange={(next) => toggle(room, next)}
                            />

                            {room.enabled && room.options.length > 0 && (
                                <ul className="mt-5 flex flex-col gap-4 border-t pt-5">
                                    {room.options.map((option) => (
                                        <li key={option.key}>
                                            <SwitchRow
                                                label={option.label}
                                                description={option.description}
                                                checked={option.enabled}
                                                disabled={pending.has(
                                                    `${room.slug}:${option.key}`,
                                                )}
                                                onChange={(next) =>
                                                    toggle(room, next, option)
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Page>
    );
}
