import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { mutationOptions } from '@/lib/mutation';
import { count } from '@/lib/plural';
import { DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import ItemThumb from '@/MiniApps/Corner/Components/ItemThumb';
import ListMenu from '@/MiniApps/Corner/Components/ListMenu';
import ListSettingsSheet from '@/MiniApps/Corner/Components/ListSettingsSheet';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { ListSettings } from '@/MiniApps/Corner/lib/presets';
import { SUGGESTED_LISTS } from '@/MiniApps/Corner/lib/presets';
import type { CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show } from '@/routes/apps/our-shelf/lists';
import { store } from '@/routes/apps/our-shelf/lists';
import Page from '@/Shell/Components/Page';
import RoomDoor from '@/Shell/Components/RoomDoor';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';

type PeekItem = { title: string; done: boolean; picture_url: string | null };

type Door = CornerListInfo & {
    count: number;
    done: number;
    /* The newest few, newest first. */
    peek: PeekItem[];
};

type Props = {
    lists: Door[];
    can: { create: boolean };
};

const TITLES = 3;

/* Doors whose list is fetched as soon as the shelf shows; the rest wait for a hover. */
const PREFETCH_DOORS = 4;

function liveLine(door: Door): string {
    if (door.count === 0) {
        return 'Nothing yet';
    }

    const total = count(door.count, 'thing');

    return door.done > 0
        ? `${total} · ${door.done} ${door.done_label.toLowerCase()}`
        : total;
}

/*
 * A glimpse of the list: its pictures on a shelf when the newest things have any (a thing
 * without one shows the list's icon in its place), its newest names otherwise, and the icon
 * alone while the list is empty.
 */
function DoorPeek({ door }: { door: Door }) {
    const { peek } = door;

    if (peek.length === 0) {
        return (
            <span className="corner-door-empty">
                <LinkableIcon name={door.icon} size={28} strokeWidth={1.5} />
            </span>
        );
    }

    if (peek.some((item) => item.picture_url !== null)) {
        return (
            <span className="corner-door-shelf">
                {peek.map((item, i) => (
                    <ItemThumb
                        key={`${i}-${item.title}`}
                        pictureUrl={item.picture_url}
                        icon={door.icon}
                        className="corner-door-cover"
                    />
                ))}
            </span>
        );
    }

    return (
        <ul className="corner-door-scrap">
            {peek.slice(0, TITLES).map((item, i) => (
                <li key={`${i}-${item.title}`}>
                    <span className="corner-door-scrap-title">
                        {item.title}
                    </span>
                    {item.done && (
                        <DoneSticker
                            icon={door.done_icon}
                            label={door.done_label}
                        />
                    )}
                </li>
            ))}
        </ul>
    );
}

function CornerDoor({
    door,
    first,
    last,
    prefetchOnMount,
}: {
    door: Door;
    first: boolean;
    last: boolean;
    prefetchOnMount: boolean;
}) {
    return (
        <RoomDoor
            href={show.url(door.slug)}
            prefetch={prefetchOnMount ? 'mount' : 'hover'}
            name={door.name}
            peek={<DoorPeek door={door} />}
            live={liveLine(door)}
            className="corner-card corner-door"
            peekClassName="corner-door-peek"
            nameClassName="corner-door-name"
            liveClassName="corner-door-live"
            nameBefore={
                <LinkableIcon
                    name={door.icon}
                    size={18}
                    strokeWidth={1.5}
                    className="corner-door-icon"
                />
            }
            headClassName="corner-door-head"
            aside={
                <ListMenu
                    list={door}
                    count={door.count}
                    reorder={{ first, last }}
                />
            }
        />
    );
}

/*
 * A fresh room has no lists. Rather than starting everyone with one family's choices, it
 * offers some to pick in one tap, and the sheet for anything else.
 */
function Suggestions({ onCustom }: { onCustom: () => void }) {
    const [pending, setPending] = useState<string | null>(null);

    const make = (preset: ListSettings) => {
        router.post(store.url(), preset, {
            ...mutationOptions({
                component: 'Corner/Landing',
                action: 'suggested-list',
                onPendingChange: (busy) =>
                    setPending(busy ? preset.name : null),
            }),
        });
    };

    return (
        <section
            className="corner-suggestions"
            aria-labelledby="corner-suggestions-title"
        >
            <h2
                id="corner-suggestions-title"
                className="corner-suggestions-title"
            >
                Start a list
            </h2>
            <p className="corner-suggestions-body">
                Somewhere to keep the things you want to share: songs to play,
                films to watch, places to go. Pick one to start, or make your
                own.
            </p>
            <ul className="corner-suggestion-grid">
                {SUGGESTED_LISTS.map((preset) => {
                    return (
                        <li key={preset.name}>
                            <button
                                type="button"
                                className="corner-suggestion shell-press"
                                disabled={pending !== null}
                                aria-busy={pending === preset.name}
                                onClick={() => make(preset)}
                            >
                                <LinkableIcon
                                    name={preset.icon}
                                    size={22}
                                    strokeWidth={1.5}
                                    className="corner-suggestion-icon"
                                />
                                <span className="corner-suggestion-name">
                                    {preset.name}
                                </span>
                                <span className="corner-suggestion-kind">
                                    {preset.done_label} or{' '}
                                    {preset.todo_label.toLowerCase()}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <Button
                type="button"
                variant="outline"
                className="shell-press"
                onClick={onCustom}
            >
                <Plus aria-hidden="true" size={16} />
                Make your own
            </Button>
        </section>
    );
}

export default function Landing({ lists, can }: Props) {
    const [creating, setCreating] = useState(false);

    return (
        <CornerLayout>
            <Page
                title="Our Shelf"
                documentTitle="Our Shelf"
                backChevron
                actions={
                    can.create &&
                    lists.length > 0 && (
                        <Button
                            type="button"
                            className="shell-press"
                            onClick={() => setCreating(true)}
                        >
                            <Plus aria-hidden="true" size={16} />
                            New list
                        </Button>
                    )
                }
            >
                {lists.length === 0 ? (
                    can.create && (
                        <Suggestions onCustom={() => setCreating(true)} />
                    )
                ) : (
                    <div className="corner-doors-wrap">
                        <div className="corner-doors">
                            {lists.map((door, i) => (
                                <CornerDoor
                                    key={door.id}
                                    door={door}
                                    first={i === 0}
                                    prefetchOnMount={i < PREFETCH_DOORS}
                                    last={i === lists.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </Page>

            {creating && (
                <ListSettingsSheet
                    open
                    onOpenChange={(next) => {
                        if (!next) {
                            setCreating(false);
                        }
                    }}
                />
            )}
        </CornerLayout>
    );
}
