import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PersonAvatar from '@/Shell/Components/PersonAvatar';

describe('PersonAvatar', () => {
    it('shows initials when there is no picture, hidden beside the printed name', () => {
        const { container } = render(
            <PersonAvatar person={{ name: 'Kabir Rao', avatar_url: null }} />,
        );
        const root = container.querySelector('[data-slot=avatar]');

        expect(root?.getAttribute('aria-hidden')).toBe('true');
        expect(root?.textContent).toBe('KR');
        expect(container.querySelector('img')).toBeNull();
    });

    it('shows one initial at the small sizes', () => {
        const { container } = render(
            <PersonAvatar
                person={{ name: 'Meera Rao', avatar_url: null }}
                size={20}
            />,
        );

        expect(container.textContent).toBe('M');
    });

    it('is named when it stands alone', () => {
        const { getByRole } = render(
            <PersonAvatar
                person={{ name: 'Ravi Rao', avatar_url: null }}
                decorative={false}
            />,
        );

        expect(getByRole('img', { name: 'Ravi Rao' })).toBeTruthy();
    });
});
