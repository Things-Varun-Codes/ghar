import { beforeEach, describe, expect, it } from 'vitest';

import { setRegion } from '@/lib/dates';

import { describeActivity } from './expenseActivity';
import type { ExpenseActivity } from './expenseActivity';

const names: Record<number, string> = { 1: 'you', 2: 'Ravi', 3: 'Meera' };
const who = (id: number) => names[id] ?? 'someone';

function line(
    action: string,
    data: ExpenseActivity['data'],
    actorId = 2,
): string {
    return describeActivity(
        {
            id: 1,
            action,
            actor: { id: actorId, name: 'Ravi', avatar_url: null },
            expense_id: null,
            data,
            at: '2026-11-01T10:00:00Z',
            can_restore: false,
        },
        who,
    );
}

describe('describeActivity', () => {
    beforeEach(() =>
        setRegion({
            timezone: 'UTC',
            locale: 'en-IN',
            week_start: 1,
            currency: 'INR',
        }),
    );

    it('says what changed on an expense, and only that', () => {
        expect(
            line('expense.updated', {
                title: 'Groceries',
                before: { amount: 40000, shares: { 2: 20000, 3: 20000 } },
                after: { amount: 45000, shares: { 2: 22500, 3: 22500 } },
            }),
        ).toBe(
            'Ravi changed the amount of “Groceries” from ₹400.00 to ₹450.00',
        );

        expect(
            line('expense.updated', {
                title: 'Lunch',
                before: { title: 'Lunhc', paid_by_id: 2 },
                after: { title: 'Lunch', paid_by_id: 1 },
            }),
        ).toBe(
            'Ravi renamed “Lunhc” to “Lunch” and changed who paid for “Lunch” from Ravi to you',
        );

        expect(
            line('expense.updated', {
                title: 'Lunch',
                before: { shares: { 2: 100 } },
                after: { shares: { 3: 100 } },
            }),
        ).toBe('Ravi changed how “Lunch” is split');
    });

    it('names people, the viewer as you', () => {
        expect(
            line(
                'settlement.recorded',
                { from_id: 3, to_id: 2, amount: 50000 },
                1,
            ),
        ).toBe('You recorded that Meera paid Ravi ₹500.00');

        expect(
            line('settlement.recorded', { from_id: 2, to_id: 3, amount: 100 }),
        ).toBe('Ravi recorded paying Meera ₹1.00');

        expect(
            line('group.members_changed', { added: [3, 9], removed: [1] }),
        ).toBe('Ravi added Meera and someone and removed you');
    });

    it('reads the rest, and an action it does not know', () => {
        expect(line('expense.deleted', { title: 'Taxi', amount: 10000 })).toBe(
            'Ravi deleted “Taxi” (₹100.00)',
        );
        expect(line('group.renamed', { before: 'Trip', after: 'Goa' })).toBe(
            'Ravi renamed the group from “Trip” to “Goa”',
        );
        // PHP sends an empty data array as [].
        expect(line('group.archived', [])).toBe('Ravi archived the group');
        expect(line('something.new', null)).toBe('Ravi made a change');
    });
});
