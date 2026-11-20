import { Head, Link, usePage } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import { Settle, SettleItem } from '@/components/motion';
import { buttonVariants } from '@/components/ui/button';
import { formatPlainDate, region } from '@/lib/dates';
import { count } from '@/lib/plural';
import { cn } from '@/lib/utils';
import * as rooms from '@/routes/admin/rooms';
import EmptyState from '@/Shell/Components/EmptyState';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Auth } from '@/types/auth';
import type { MiniApp, MiniAppPreview } from '@/types/miniapp';
import type { Person } from '@/types/person';

import { dayKey, freshnessWeight, shortAgo } from './dashboard-time';

type FeedEntry = {
    room: string;
    kind: 'needs' | 'new';
    title: string;
    detail: string | null;
    at: string;
    href: string;
    action: string | null;
    person: Person | null;
    image: string | null;
    quoted?: boolean;
};

type Birthday = { person: Person; on: string; turns: number };

type SharedProps = {
    auth: Auth;
    miniApps: MiniApp[];
    summaries?: Record<string, string>;
    previews?: Record<string, MiniAppPreview>;
    feed?: FeedEntry[];
    today?: string;
    birthdays?: Birthday[];
};

function greetingFor(hour: number): string {
    if (hour >= 5 && hour <= 11) {
        return 'Good morning';
    }

    if (hour >= 12 && hour <= 16) {
        return 'Good afternoon';
    }

    if (hour >= 17 && hour <= 21) {
        return 'Good evening';
    }

    return 'Still up';
}

export default function Dashboard() {
    const { props } = usePage<SharedProps>();
    const firstName = (props.auth.user?.name ?? '').trim().split(/\s+/)[0];
    const miniApps = props.miniApps ?? [];
    const isAdmin = props.auth.user?.roles?.includes('admin') ?? false;
    const feed = props.feed ?? [];
    const birthdays = props.birthdays ?? [];
    const today = props.today ?? dayKey(new Date().toISOString());

    const needs = feed.filter((entry) => entry.kind === 'needs');
    const fresh = feed.filter((entry) => entry.kind === 'new');

    const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: region().timezone,
        }).format(new Date()),
    );
    const greeting = `${greetingFor(hour)}${firstName ? ', ' + firstName : ''}`;

    if (miniApps.length === 0) {
        return (
            <>
                <Head title="Home" />
                <div className="os-home">
                    <h1 className="page-h1">{greeting}</h1>
                    {isAdmin ? (
                        <EmptyState
                            title="This home has no rooms yet"
                            body="Choose the ones you want. You can change them whenever you like."
                            action={
                                <Link
                                    href={rooms.index.url()}
                                    className={cn(
                                        buttonVariants(),
                                        'shell-press',
                                    )}
                                >
                                    Choose rooms
                                </Link>
                            }
                        />
                    ) : (
                        <EmptyState
                            title="Nothing here yet"
                            body="Rooms show up here once an admin turns them on."
                        />
                    )}
                </div>
            </>
        );
    }

    const weekday = formatPlainDate(today, { intl: { weekday: 'short' } });
    const dayOfMonth = formatPlainDate(today, { intl: { day: 'numeric' } });
    const month = formatPlainDate(today, { intl: { month: 'long' } });

    return (
        <>
            <Head title="Home" />

            <div className="os-home">
                <header className="os-home-head">
                    <h1 className="os-home-date">
                        <span className="os-home-day">
                            {weekday} {dayOfMonth}
                        </span>
                        <span className="os-home-month">
                            {month} ·{' '}
                            {needs.length > 0
                                ? `${count(needs.length, 'thing')} for you`
                                : fresh.length > 0
                                  ? `${count(fresh.length, 'new thing')} this week`
                                  : 'a quiet week'}
                            {firstName ? `, ${firstName}` : ''}
                        </span>
                    </h1>
                </header>

                <Settle>
                    {needs.length > 0 && (
                        <section
                            className="os-home-section"
                            aria-labelledby="home-needs"
                        >
                            <h2 id="home-needs" className="os-home-h2">
                                Needs you{' '}
                                <span className="os-home-h2-count">
                                    {needs.length}
                                </span>
                            </h2>
                            <ul className="os-slips">
                                {needs.map((entry, index) => (
                                    <SettleItem
                                        key={`${entry.room}-${entry.href}-${index}`}
                                        index={index}
                                    >
                                        <Slip entry={entry} />
                                    </SettleItem>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section
                        className="os-home-section"
                        aria-labelledby="home-new"
                    >
                        <h2 id="home-new" className="os-home-h2">
                            New this week
                        </h2>
                        {fresh.length > 0 ? (
                            <ul className="os-feed">
                                {fresh.map((entry, index) => (
                                    <SettleItem
                                        key={`${entry.room}-${entry.href}`}
                                        index={needs.length + index}
                                    >
                                        <FeedRow
                                            entry={entry}
                                            weight={freshnessWeight(entry.at)}
                                        />
                                    </SettleItem>
                                ))}
                            </ul>
                        ) : (
                            <p className="os-home-quiet">
                                Nothing new from anyone this week.
                            </p>
                        )}
                    </section>

                    {birthdays.length > 0 && (
                        <section
                            className="os-home-section"
                            aria-labelledby="home-soon"
                        >
                            <h2 id="home-soon" className="os-home-h2">
                                Coming up
                            </h2>
                            <ul className="os-feed">
                                {birthdays.map((birthday) => (
                                    <li
                                        key={birthday.person.id}
                                        className="os-feed-row os-feed-row--still"
                                    >
                                        <PersonAvatar
                                            person={birthday.person}
                                            size={32}
                                        />
                                        <span className="os-feed-text">
                                            <span className="os-feed-title">
                                                {birthday.on === today
                                                    ? `${birthday.person.name} turns ${birthday.turns} today`
                                                    : `${birthday.person.name} turns ${birthday.turns}`}
                                            </span>
                                        </span>
                                        <time
                                            className="os-feed-meta"
                                            dateTime={birthday.on}
                                        >
                                            {formatPlainDate(birthday.on, {
                                                intl: {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                },
                                            })}
                                        </time>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </Settle>
            </div>
        </>
    );
}

/* A small stable number from a string, so a slip keeps its tilt and magnet spot between visits. */
function hashOf(text: string): number {
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }

    return Math.abs(hash);
}

/* A slip pinned up by the sender's face, ringed in their colour, each pinned a little differently. */
function Slip({ entry }: { entry: FeedEntry }) {
    const magnet = ((entry.person?.id ?? 0) % 5) + 1;
    const hash = hashOf(entry.href + entry.title);
    const style = {
        '--slip-tilt': `${((hash % 9) - 4) * 0.45}deg`,
        '--slip-drop': `${(hash >> 4) % 10}px`,
        '--magnet-x': `${35 + ((hash >> 8) % 31)}%`,
        '--magnet': `var(--magnet-${magnet})`,
    } as CSSProperties;

    return (
        <Link href={entry.href} className="os-slip shell-focus" style={style}>
            <span className="os-slip-magnet" aria-hidden="true">
                {entry.person && (
                    <PersonAvatar person={entry.person} size={32} />
                )}
            </span>
            <span className="os-slip-title">{entry.title}</span>
            {entry.detail && (
                <span
                    className="os-slip-detail"
                    data-quoted={entry.quoted || undefined}
                >
                    {entry.detail}
                </span>
            )}
            <span className="os-slip-foot">
                <span className="os-feed-action">{entry.action}</span>
                <time className="os-feed-meta" dateTime={entry.at}>
                    {shortAgo(entry.at)}
                </time>
            </span>
        </Link>
    );
}

function FeedRow({ entry, weight }: { entry: FeedEntry; weight: number }) {
    return (
        <Link
            href={entry.href}
            className="os-feed-row shell-focus"
            data-kind={entry.kind}
        >
            {entry.person ? (
                <PersonAvatar person={entry.person} size={32} />
            ) : (
                <span className="os-feed-dot" aria-hidden="true" />
            )}
            <span className="os-feed-text">
                <span className="os-feed-title" style={{ fontWeight: weight }}>
                    {entry.title}
                </span>
                {entry.detail && (
                    <span className="os-feed-detail">{entry.detail}</span>
                )}
            </span>
            {entry.action ? (
                <span className="os-feed-action">{entry.action}</span>
            ) : (
                <span className="os-feed-end">
                    {entry.image && (
                        <img
                            className="os-feed-thumb"
                            src={entry.image}
                            alt=""
                            loading="lazy"
                        />
                    )}
                    <time className="os-feed-meta" dateTime={entry.at}>
                        {shortAgo(entry.at)}
                    </time>
                </span>
            )}
        </Link>
    );
}
