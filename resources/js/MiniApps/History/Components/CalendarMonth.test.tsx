import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setRegion } from '@/lib/dates';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import CalendarMonth from './CalendarMonth';

afterEach(() => setRegion({ timezone: 'UTC', locale: 'en-GB', week_start: 1 }));

const moment = {
    id: 7,
    date: '2026-10-05',
    date_label: '5 Oct 2026',
    title: 'Pottery',
    media: [],
} as unknown as HistoryEvent;

// 1 October 2026 is a Thursday.
function october(today: { month: number; day: number } | null = null) {
    return render(
        <CalendarMonth
            year={2026}
            month={10}
            eventsByDay={new Map([[5, [moment]]])}
            size="compact"
            todayMonthDay={today}
            onOpen={vi.fn()}
        />,
    );
}

function headers(): string[] {
    return screen
        .getAllByRole('columnheader')
        .map((h) => h.getAttribute('aria-label') ?? '');
}

function firstWeekPads(container: HTMLElement): number {
    return container
        .querySelector('.history-cal-week')!
        .querySelectorAll('.history-cal-cell--pad').length;
}

describe('CalendarMonth', () => {
    it('starts the week on Monday when the household does', () => {
        const { container } = october();

        expect(headers()).toEqual([
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
        ]);
        expect(firstWeekPads(container)).toBe(3);
    });

    it('starts the week on Sunday when the household does', () => {
        setRegion({
            timezone: 'America/New_York',
            locale: 'en-US',
            week_start: 0,
        });
        const { container } = october();

        expect(headers()[0]).toBe('Sunday');
        expect(headers()[6]).toBe('Saturday');
        expect(firstWeekPads(container)).toBe(4);
    });

    it("names the month, weekdays and days in the household's locale", () => {
        setRegion({ timezone: 'Europe/Paris', locale: 'fr-FR', week_start: 1 });
        october();

        expect(screen.getByRole('heading').textContent).toBe('octobre 2026');
        expect(headers()[0]).toBe('lundi');
        expect(
            screen.getByRole('button', { name: '5 octobre: Pottery' }),
        ).toBeTruthy();
    });

    it('marks the day it is given as today', () => {
        const { container } = october({ month: 10, day: 12 });

        expect(
            container.querySelector('[aria-current="date"]')?.textContent,
        ).toBe('12');
    });
});
