import { usePage } from '@inertiajs/react';
import { formatPlainDate } from '@/lib/dates';
import { birthdayOf } from '@/MiniApps/History/lib/birthdays';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import PersonAvatar from '@/Shell/Components/PersonAvatar';

type Props = {
    /* Moments from today's date in earlier years, newest first. */
    events: HistoryEvent[];
    onOpen: (event: HistoryEvent) => void;
};

function yearsAgo(year: number, todayYear: number): string {
    const ago = todayYear - year;

    if (ago <= 0) {
        return 'today';
    }

    return ago === 1 ? '1 year ago' : `${ago} years ago`;
}

/* The top of the Timeline and the Calendar while today has moments from earlier years. */
export default function OnThisDayStrip({ events, onOpen }: Props) {
    // The household's day, which the server matched on, not this device's.
    const todayIso = usePage<{ today: string }>().props.today;

    if (events.length === 0) {
        return null;
    }

    const todayYear = Number(todayIso.slice(0, 4));
    const today = formatPlainDate(todayIso, {
        intl: { day: 'numeric', month: 'short' },
    });

    return (
        <section className="history-otd" aria-labelledby="history-otd-head">
            <h2 id="history-otd-head" className="history-otd-head">
                <span className="history-otd-dot" aria-hidden="true" />
                On this day · {today}
            </h2>
            <div className="history-otd-row">
                {events.map((e) => {
                    const thumb =
                        e.media.find((m) => m.thumb || m.poster)?.thumb ?? null;

                    return (
                        <button
                            key={e.id}
                            type="button"
                            className="history-otd-card shell-press"
                            onClick={() => onOpen(e)}
                        >
                            <span
                                className="history-otd-thumb"
                                style={
                                    thumb
                                        ? { backgroundImage: `url("${thumb}")` }
                                        : undefined
                                }
                                aria-hidden="true"
                            />
                            <span className="history-otd-text">
                                <span className="history-otd-year">
                                    {e.year}
                                </span>
                                <span className="history-otd-title">
                                    {e.title ?? e.date_label}
                                </span>
                                <span className="history-otd-sub">
                                    {yearsAgo(e.year, todayYear)}
                                    {e.birthday_of ? (
                                        <>
                                            {' · '}
                                            <PersonAvatar
                                                person={e.birthday_of}
                                                size={20}
                                                className="history-otd-face"
                                            />
                                            {birthdayOf(e.birthday_of)}
                                        </>
                                    ) : (
                                        e.location_name &&
                                        ` · ${e.location_name}`
                                    )}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
