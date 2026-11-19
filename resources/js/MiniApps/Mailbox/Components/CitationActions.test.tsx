import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CitationActions from './CitationActions';
import type { CitationPayload } from './CitationCard';

const { routerPatch, routerDelete } = vi.hoisted(() => ({
    routerPatch: vi.fn(),
    routerDelete: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { patch: routerPatch, delete: routerDelete },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const citation: CitationPayload = {
    id: 7,
    ref_no: 'OC/2026/000007',
    status: 'issued',
    offence: 'Left the lights on',
    incident_date: null,
    incident_place: null,
    is_repeat: false,
    penalty: 'One foot rub',
    remarks: null,
    issued_at: '2026-11-01T10:00:00Z',
    issued_at_human: '2 weeks ago',
    settled_at: null,
    is_mine: false,
    issuer: { id: 1, name: 'Ravi', avatar_url: null },
    recipient: { id: 2, name: 'Meera', avatar_url: null },
    available_actions: ['pay'],
};

function openConfirm() {
    render(<CitationActions citation={citation} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay penalty' }));

    return screen.getByRole('alertdialog');
}

describe('CitationActions pay', () => {
    it('asks before paying and quotes the penalty', () => {
        const dialog = openConfirm();

        expect(routerPatch).not.toHaveBeenCalled();
        expect(dialog.textContent).toContain('Pay this penalty?');
        expect(dialog.textContent).toContain('“One foot rub”');
    });

    it('"Not yet" closes without paying', () => {
        openConfirm();
        fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));

        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(routerPatch).not.toHaveBeenCalled();
    });

    it('pays once on confirm and shows the pending state', () => {
        const dialog = openConfirm();
        const confirm = Array.from(dialog.querySelectorAll('button')).find(
            (b) => b.textContent === 'Pay penalty',
        )!;

        fireEvent.click(confirm);

        // Confirming closes the dialog, so the pending state shows on the trigger.
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(routerPatch).toHaveBeenCalledTimes(1);
        const [url, , options] = routerPatch.mock.calls[0];
        expect(url).toContain('/citations/7');

        act(() => options.onStart());

        const trigger = screen.getByRole('button', { name: /Paying/ });
        expect((trigger as HTMLButtonElement).disabled).toBe(true);

        act(() => options.onFinish());

        expect(
            screen.getByRole('button', { name: 'Pay penalty' }),
        ).toBeTruthy();
    });

    it('withdraws only after "Withdraw" is confirmed', () => {
        render(
            <CitationActions
                citation={{
                    ...citation,
                    is_mine: true,
                    available_actions: ['delete'],
                }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

        const dialog = screen.getByRole('alertdialog');
        expect(dialog.textContent).toContain('Withdraw this citation?');

        fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(routerDelete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
        const confirm = Array.from(
            screen.getByRole('alertdialog').querySelectorAll('button'),
        ).find((b) => b.textContent === 'Withdraw')!;
        fireEvent.click(confirm);

        expect(routerDelete).toHaveBeenCalledTimes(1);
        expect(routerDelete.mock.calls[0][0]).toContain('/citations/7');
    });

    it('offers no pay button when paying is not allowed', () => {
        render(
            <CitationActions
                citation={{ ...citation, available_actions: ['delete'] }}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Pay penalty' }),
        ).toBeNull();
    });
});
