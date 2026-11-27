import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setRegion } from '@/lib/dates';

import ExpenseBalanceRow from './ExpenseBalanceRow';

const { routerPost } = vi.hoisted(() => ({ routerPost: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post: routerPost } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const ravi = { id: 4, name: 'Ravi', avatar_url: null };

function confirmSettle(net: number) {
    render(
        <ul>
            <ExpenseBalanceRow person={ravi} net={net} />
        </ul>,
    );
    fireEvent.click(
        screen.getByRole('button', { name: 'Settle up with Ravi' }),
    );

    return screen.getByRole('alertdialog');
}

describe('ExpenseBalanceRow', () => {
    beforeEach(() => {
        routerPost.mockClear();
        setRegion({
            timezone: 'UTC',
            locale: 'en-IN',
            week_start: 1,
            currency: 'INR',
        });
    });

    it('says who owes whom in words and asks before settling', () => {
        const dialog = confirmSettle(-50000);

        expect(screen.getByText('₹500.00').parentElement?.textContent).toBe(
            'You owe Ravi ₹500.00',
        );
        expect(dialog.textContent).toContain('you paid Ravi ₹500.00');
        expect(dialog.textContent).toContain('each group you share');
        expect(routerPost).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));
        expect(routerPost).not.toHaveBeenCalled();
    });

    it.each([-50000, 20000])(
        'posts the net it showed (%i) to that person on confirm',
        (net) => {
            const dialog = confirmSettle(net);
            const confirm = Array.from(dialog.querySelectorAll('button')).find(
                (b) => b.textContent === 'Settle up',
            )!;

            fireEvent.click(confirm);

            expect(routerPost).toHaveBeenCalledTimes(1);
            const [url, data] = routerPost.mock.calls[0];
            expect(url).toBe('/apps/our-exchange/expenses/settle/4');
            expect(data).toEqual({ expected_net: net });
        },
    );
});
