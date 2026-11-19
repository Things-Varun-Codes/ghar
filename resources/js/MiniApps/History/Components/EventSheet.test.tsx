import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactions, testMoment } from '@/MiniApps/History/lib/testMoment';
import EventSheet from './EventSheet';

const router = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    on: vi.fn(() => () => {}),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router,
    usePage: () => ({
        props: {
            errors: {},
            linking: { types: [], searchable: false },
        },
    }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

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

const meera = { id: 3, name: 'Meera', avatar_url: null };

/* The footer's Close, not the corner X: both go through the gate. */
function closeButton() {
    return screen.getByText('Close', { selector: 'button' });
}

function openSheet(onOpenChange = vi.fn()) {
    render(
        <EventSheet
            open
            onOpenChange={onOpenChange}
            mode="read"
            editingEvent={testMoment({
                reactions: reactions({
                    heart: { count: 1, mine: true, people: [meera] },
                }),
            })}
        />,
    );

    return onOpenChange;
}

describe('EventSheet comments and the draft gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.replaceState({ page: {} }, '', '/apps/our-history');
    });

    it('closes straight away with nothing typed', () => {
        const onOpenChange = openSheet();

        fireEvent.click(closeButton());

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('asks before throwing an unsent comment away', () => {
        const onOpenChange = openSheet();

        fireEvent.change(screen.getByLabelText('Add a comment'), {
            target: { value: 'What a drive' },
        });
        fireEvent.click(closeButton());

        expect(onOpenChange).not.toHaveBeenCalled();
        const prompt = screen.getByRole('alertdialog');
        expect(prompt.textContent).toContain('Discard your comment?');

        fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('a comment of only spaces is not a draft', () => {
        const onOpenChange = openSheet();

        fireEvent.change(screen.getByLabelText('Add a comment'), {
            target: { value: '   ' },
        });
        fireEvent.click(closeButton());

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('posts the comment for the moment only, and a sent one is no longer a draft', () => {
        const onOpenChange = openSheet();

        fireEvent.change(screen.getByLabelText('Add a comment'), {
            target: { value: 'What a drive' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));

        expect(router.post).toHaveBeenCalledTimes(1);
        const [url, data, options] = router.post.mock.calls[0];
        expect(url).toContain('/events/5/comments');
        expect(data).toEqual({ body: 'What a drive' });
        expect(options).toMatchObject({
            only: ['moment'],
            preserveState: true,
            preserveScroll: true,
        });

        act(() => options.onSuccess());
        expect(
            (screen.getByLabelText('Add a comment') as HTMLTextAreaElement)
                .value,
        ).toBe('');

        fireEvent.click(closeButton());
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('takes a reaction off with DELETE and puts one on with PUT', () => {
        openSheet();

        fireEvent.click(screen.getByRole('button', { name: /Love/ }));
        expect(router.delete).toHaveBeenCalledTimes(1);
        expect(router.delete.mock.calls[0][0]).toContain(
            '/events/5/reactions/heart',
        );
        expect(router.delete.mock.calls[0][1]).toMatchObject({
            only: ['moment'],
        });

        act(() => router.delete.mock.calls[0][1].onStart());
        fireEvent.click(screen.getByRole('button', { name: /Celebrate/ }));
        // One at a time: the heart is still on its way.
        expect(router.put).not.toHaveBeenCalled();

        act(() => router.delete.mock.calls[0][1].onFinish());
        fireEvent.click(screen.getByRole('button', { name: /Celebrate/ }));
        expect(router.put.mock.calls[0][0]).toContain(
            '/events/5/reactions/party',
        );
    });

    it('marks the viewer’s reactions pressed and names who reacted', () => {
        openSheet();

        const heart = screen.getByRole('button', { name: /Love/ });
        expect(heart.getAttribute('aria-pressed')).toBe('true');
        expect(heart.textContent).toContain('1');
        expect(
            screen
                .getByRole('button', { name: /Celebrate/ })
                .getAttribute('aria-pressed'),
        ).toBe('false');

        const describedBy = heart.getAttribute('aria-describedby');
        expect(document.getElementById(describedBy!)?.textContent).toContain(
            'Meera',
        );
    });
});
