import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { testMoment } from '@/MiniApps/History/lib/testMoment';
import DayEventMenu from './DayEventMenu';

it('opens on a day with several moments and opens the one picked', async () => {
    const onOpen = vi.fn();
    render(
        <DayEventMenu
            month={6}
            day={4}
            size="compact"
            todayClass=""
            onOpen={onOpen}
            events={[
                testMoment({ id: 1, title: 'Breakfast' }),
                testMoment({ id: 2, title: 'Dinner' }),
            ]}
        />,
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Dinner/ }));

    expect(onOpen).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2 }),
        expect.anything(),
    );
});
