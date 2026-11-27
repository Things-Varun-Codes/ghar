import type * as InertiaReact from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import ExpenseGroupSheet from './ExpenseGroupSheet';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    router: {
        push: vi.fn(),
        replace: vi.fn(),
        on: vi.fn(() => () => {}),
    },
}));

beforeAll(() => {
    window.matchMedia ??= ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
});

const me = { id: 1, name: 'Asha', avatar_url: null };
const juhie = { id: 2, name: 'Juhie', avatar_url: null };
const nisha = {
    id: 3,
    name: 'Nisha (deleted)',
    avatar_url: null,
    former: true as const,
};

describe('ExpenseGroupSheet', () => {
    it('lets a household of two create a group once it has a name', () => {
        render(
            <ExpenseGroupSheet
                open
                onOpenChange={() => {}}
                household={[me, juhie]}
                viewerId={me.id}
            />,
        );

        fireEvent.change(screen.getByLabelText(/Name/), {
            target: { value: 'Goa Dec 2026' },
        });

        expect(screen.queryByText('Choose who is in it.')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Create group' }),
        ).toHaveProperty('disabled', false);
    });

    it('never offers a former member', () => {
        render(
            <ExpenseGroupSheet
                open
                onOpenChange={() => {}}
                household={[me, juhie, nisha]}
                viewerId={me.id}
            />,
        );

        expect(screen.getByText('Juhie')).toBeTruthy();
        expect(screen.queryByText('Nisha (deleted)')).toBeNull();
    });
});
