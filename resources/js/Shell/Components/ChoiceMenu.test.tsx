import { act, fireEvent, render, screen } from '@testing-library/react';
import { ArrowDownUp } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';

const items = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first', hint: 'From the beginning' },
];

async function openMenu(onSelect = vi.fn()) {
    render(
        <ChoiceMenu
            label="Sort"
            icon={ArrowDownUp}
            value="recent"
            items={items}
            onSelect={onSelect}
        />,
    );

    await act(async () => {
        fireEvent.click(
            screen.getByRole('button', { name: 'Sort: Newest first' }),
        );
    });

    return onSelect;
}

describe('ChoiceMenu', () => {
    it('lists the choices as radio items, the chosen one checked', async () => {
        await openMenu();

        const radios = await screen.findAllByRole('menuitemradio');
        expect(radios).toHaveLength(2);
        expect(radios[0].getAttribute('aria-checked')).toBe('true');
        expect(radios[1].getAttribute('aria-checked')).toBe('false');
        expect(screen.getByText('From the beginning')).toBeTruthy();
    });

    it('reports a new choice', async () => {
        const onSelect = await openMenu();

        await act(async () => {
            fireEvent.click(
                await screen.findByRole('menuitemradio', {
                    name: /Oldest first/,
                }),
            );
        });

        expect(onSelect).toHaveBeenCalledWith('oldest');
    });

    it('stays quiet when the chosen one is picked again', async () => {
        const onSelect = await openMenu();

        await act(async () => {
            fireEvent.click(
                await screen.findByRole('menuitemradio', {
                    name: /Newest first/,
                }),
            );
        });

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('is the icon alone at every choice, marked away from the default', () => {
        const { rerender } = render(
            <ChoiceMenu
                label="Sort"
                icon={ArrowDownUp}
                value="recent"
                items={items}
                onSelect={vi.fn()}
            />,
        );

        const button = screen.getByRole('button', {
            name: 'Sort: Newest first',
        });
        expect(button.hasAttribute('data-changed')).toBe(false);
        expect(button.textContent).toBe('');

        rerender(
            <ChoiceMenu
                label="Sort"
                icon={ArrowDownUp}
                value="oldest"
                items={items}
                onSelect={vi.fn()}
            />,
        );

        const narrowed = screen.getByRole('button', {
            name: 'Sort: Oldest first',
        });
        expect(narrowed.hasAttribute('data-changed')).toBe(true);
        expect(narrowed.textContent).toBe('');
    });
});
