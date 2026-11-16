import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const overlay = vi.hoisted(() => ({
    open: false,
    onBack: (() => {}) as () => void,
    param: null as unknown,
}));

vi.mock('@/hooks/use-overlay-history', () => ({
    useOverlayHistory: (
        open: boolean,
        onBack: () => void,
        options: { param?: unknown } = {},
    ) => {
        overlay.open = open;
        overlay.onBack = onBack;
        overlay.param = options.param ?? null;
    },
}));

import { useDraftCloseGate } from './use-draft-close-gate';

type Props = {
    isDirty: boolean;
    closeNested?: () => boolean;
};

function setup(initial: Props) {
    const onClose = vi.fn();
    const onDiscard = vi.fn();
    const hook = renderHook(
        ({ isDirty, closeNested }: Props) =>
            useDraftCloseGate({
                open: true,
                isDirty,
                onClose,
                onDiscard,
                closeNested,
                param: ['moment', '4'],
            }),
        { initialProps: initial },
    );

    return { ...hook, onClose, onDiscard };
}

const back = () => act(() => overlay.onBack());

describe('useDraftCloseGate', () => {
    beforeEach(() => {
        overlay.onBack = () => {};
    });

    it('registers the overlay with its history param', () => {
        setup({ isDirty: false });

        expect(overlay.open).toBe(true);
        expect(overlay.param).toEqual(['moment', '4']);
    });

    it('closes a clean overlay straight away', () => {
        const { result, onClose } = setup({ isDirty: false });

        act(() => result.current.onOpenChange(false));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(result.current.prompt.open).toBe(false);
    });

    it('asks before closing a dirty overlay', () => {
        const { result, onClose } = setup({ isDirty: true });

        act(() => result.current.requestClose());

        expect(onClose).not.toHaveBeenCalled();
        expect(result.current.prompt.open).toBe(true);
    });

    it('ignores an open request from Radix', () => {
        const { result, onClose } = setup({ isDirty: true });

        act(() => result.current.onOpenChange(true));

        expect(onClose).not.toHaveBeenCalled();
        expect(result.current.prompt.open).toBe(false);
    });

    it('keep editing closes the prompt and leaves the overlay open', () => {
        const { result, onClose, onDiscard } = setup({ isDirty: true });

        act(() => result.current.requestClose());
        act(() => result.current.prompt.onOpenChange(false));

        expect(result.current.prompt.open).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
        expect(onDiscard).not.toHaveBeenCalled();
    });

    it('discard drops the draft, then closes', () => {
        const { result, onClose, onDiscard } = setup({ isDirty: true });

        act(() => result.current.requestClose());
        act(() => result.current.prompt.onDiscard());

        expect(result.current.prompt.open).toBe(false);
        expect(onDiscard).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onDiscard.mock.invocationCallOrder[0]).toBeLessThan(
            onClose.mock.invocationCallOrder[0],
        );
    });

    it('back on a clean overlay closes it', () => {
        const { onClose } = setup({ isDirty: false });

        back();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('back on a dirty overlay asks, and back again keeps editing', () => {
        const { result, onClose } = setup({ isDirty: true });

        back();
        expect(result.current.prompt.open).toBe(true);

        back();
        expect(result.current.prompt.open).toBe(false);
        expect(onClose).not.toHaveBeenCalled();

        back();
        expect(result.current.prompt.open).toBe(true);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('back closes a nested prompt before the overlay', () => {
        let nestedOpen = true;
        const closeNested = vi.fn(() => {
            if (!nestedOpen) {
                return false;
            }

            nestedOpen = false;

            return true;
        });
        const { result, onClose } = setup({ isDirty: false, closeNested });

        back();
        expect(closeNested).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        expect(result.current.prompt.open).toBe(false);

        back();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('back answers the discard prompt before a nested prompt', () => {
        const closeNested = vi.fn(() => true);
        const { result } = setup({ isDirty: true, closeNested });

        act(() => result.current.requestClose());
        back();

        expect(result.current.prompt.open).toBe(false);
        expect(closeNested).not.toHaveBeenCalled();
    });

    it('uses the latest dirty state', () => {
        const { result, rerender, onClose } = setup({ isDirty: true });

        rerender({ isDirty: false });
        act(() => result.current.requestClose());

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
