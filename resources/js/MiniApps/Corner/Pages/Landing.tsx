import { Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { mutationOptions } from '@/lib/mutation';
import { DoneSticker } from '@/MiniApps/Corner/Components/DoneMark';
import ListMenu from '@/MiniApps/Corner/Components/ListMenu';
import ListSettingsSheet from '@/MiniApps/Corner/Components/ListSettingsSheet';
import CornerLayout from '@/MiniApps/Corner/Layouts/CornerLayout';
import { ListIcon } from '@/MiniApps/Corner/lib/list-icons';
import type { ListSettings } from '@/MiniApps/Corner/lib/presets';
import { KINDS, SUGGESTED_LISTS } from '@/MiniApps/Corner/lib/presets';
import type { CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { show } from '@/routes/apps/our-corner/lists';
import { store } from '@/routes/apps/our-corner/lists';
import Page from '@/Shell/Components/Page';

type Peek =
    | { images: string[] }
    | { items: { title: string; done: boolean }[] }
    | { place: { title: string; address: string | null } | null };

type Door = CornerListInfo & {
    count: number;
    done: number;
    peek: Peek;
};

type Props = {
    lists: Door[];
    can: { create: boolean };
};

/** Empty frames on the shelf: an empty list still reads as a place for things. */
const EMPTY_FRAMES = 3;

function liveLine(door: Door): string {
    if (door.count === 0) {
        return 'Nothing yet';
    }

    const total = `${door.count} ${door.count === 1 ? 'thing' : 'things'}`;

    return door.done > 0
        ? `${total} · ${door.done} ${door.done_label.toLowerCase()}`
        : total;
}

function Shelf({
    images,
    frame,
    icon,
}: {
    images: string[];
    frame: 'cd' | 'poster';
    icon: string;
}) {
    const frameClass = frame === 'cd' ? 'corner-cd' : 'corner-poster';

    return (
        <span className="corner-door-shelf">
            {images.length > 0
                ? images.map((src, i) => (
                      <span key={`${i}-${src}`} className={frameClass}>
                          <img
                              src={src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className={`${frameClass}-cover`}
                          />
                      </span>
                  ))
                : Array.from({ length: EMPTY_FRAMES }, (_, i) => (
                      <span
                          key={i}
                          className={`${frameClass} corner-door-frame--empty`}
                      >
                          <span className={`${frameClass}-fallback`}>
                              <ListIcon
                                  name={icon}
                                  size={22}
                                  strokeWidth={1.5}
                              />
                          </span>
                      </span>
                  ))}
        </span>
    );
}

function DoorPeek({ door }: { door: Door }) {
    const { peek } = door;

    if ('images' in peek) {
        return (
            <Shelf
                images={peek.images}
                frame={door.kind === 'link' ? 'cd' : 'poster'}
                icon={door.icon}
            />
        );
    }

    if ('items' in peek) {
        return peek.items.length > 0 ? (
            <ul className="corner-door-scrap">
                {peek.items.map((item, i) => (
                    <li key={`${i}-${item.title}`}>
                        <span className="corner-door-scrap-title">
                            {item.title}
                        </span>
                        {item.done && (
                            <DoneSticker
                                icon={door.done_icon}
                                label={door.done_label}
                                inline
                            />
                        )}
                    </li>
                ))}
            </ul>
        ) : (
            <span className="corner-door-empty">
                <ListIcon name={door.icon} size={28} strokeWidth={1.5} />
            </span>
        );
    }

    return (
        <span className="corner-door-pin">
            <ListIcon
                name={door.icon}
                size={28}
                strokeWidth={1.5}
                className="corner-door-pin-icon"
            />
            {peek.place && (
                <span className="corner-door-pin-text">
                    <span className="corner-door-pin-title">
                        {peek.place.title}
                    </span>
                    {peek.place.address && (
                        <span className="corner-door-pin-address">
                            {peek.place.address}
                        </span>
                    )}
                </span>
            )}
        </span>
    );
}

function CornerDoor({
    door,
    first,
    last,
}: {
    door: Door;
    first: boolean;
    last: boolean;
}) {
    const liveId = useId();

    return (
        <article className="corner-card corner-door shell-card-stretch shell-lift">
            <div className="corner-door-peek" aria-hidden="true">
                <DoorPeek door={door} />
            </div>
            <div className="corner-door-head">
                <h2 className="corner-door-name">
                    <ListIcon
                        name={door.icon}
                        size={18}
                        strokeWidth={1.5}
                        className="corner-door-icon"
                    />
                    <Link
                        href={show.url(door.slug)}
                        prefetch="mount"
                        aria-describedby={liveId}
                        className="shell-card-link"
                    >
                        {door.name}
                    </Link>
                </h2>
                <ListMenu
                    list={door}
                    count={door.count}
                    reorder={{ first, last }}
                />
            </div>
            <p id={liveId} className="corner-door-live">
                {liveLine(door)}
            </p>
        </article>
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
                    const kind = KINDS.find((k) => k.kind === preset.kind);

                    return (
                        <li key={preset.name}>
                            <button
                                type="button"
                                className="corner-suggestion shell-press"
                                disabled={pending !== null}
                                aria-busy={pending === preset.name}
                                onClick={() => make(preset)}
                            >
                                <ListIcon
                                    name={preset.icon}
                                    size={22}
                                    strokeWidth={1.5}
                                    className="corner-suggestion-icon"
                                />
                                <span className="corner-suggestion-name">
                                    {preset.name}
                                </span>
                                <span className="corner-suggestion-kind">
                                    {kind?.short}
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
                title="Our Corner"
                documentTitle="Our Corner"
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
