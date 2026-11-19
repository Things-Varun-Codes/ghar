import { router } from '@inertiajs/react';
import { useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { mutationOptions } from '@/lib/mutation';
import * as roomsRoutes from '@/routes/admin/rooms';
import EmptyState from '@/Shell/Components/EmptyState';
import Page from '@/Shell/Components/Page';
import SwitchRow from '@/Shell/Components/SwitchRow';

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
                                id={`room-${room.slug}`}
                                label={room.name}
                                description={room.description}
                                checked={room.enabled}
                                disabled={pending.has(room.slug)}
                                onCheckedChange={(next) => toggle(room, next)}
                                labelClassName="os-admin-section-title"
                                descriptionClassName="os-settings-row-status"
                            />

                            {room.enabled && room.options.length > 0 && (
                                <Separator className="my-5" />
                            )}
                            {room.enabled && room.options.length > 0 && (
                                <ul className="flex flex-col gap-4">
                                    {room.options.map((option) => (
                                        <li key={option.key}>
                                            <SwitchRow
                                                id={`room-${room.slug}-${option.key}`}
                                                label={option.label}
                                                description={option.description}
                                                checked={option.enabled}
                                                disabled={pending.has(
                                                    `${room.slug}:${option.key}`,
                                                )}
                                                onCheckedChange={(next) =>
                                                    toggle(room, next, option)
                                                }
                                                labelClassName="os-settings-row-label"
                                                descriptionClassName="os-settings-row-status"
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
