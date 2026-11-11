/*
 * react-remove-scroll's touchmove listener can cancel an iOS selection drag inside a Sheet
 * (react-remove-scroll #130). A capture-phase listener stops it during an active selection.
 */

import { useEffect } from 'react';

function isActiveSelectionOnTarget(target: EventTarget | null): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    const sel = document.getSelection();

    if (!sel || sel.isCollapsed) {
        return false;
    }

    if (!(target instanceof Node)) {
        return false;
    }

    const anchorOn =
        !!sel.anchorNode &&
        (sel.anchorNode === target || sel.anchorNode.contains(target));
    const focusOn =
        !!sel.focusNode &&
        (sel.focusNode === target || sel.focusNode.contains(target));

    return anchorOn || focusOn;
}

export function useAllowTouchSelection() {
    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            return;
        }

        // Scope to touch devices only — desktop mouse/trackpad drag-select
        // never hits react-remove-scroll's touchmove path, so there is
        // nothing to guard against there.
        if (
            typeof window.matchMedia === 'function' &&
            !window.matchMedia('(pointer: coarse)').matches
        ) {
            return;
        }

        const onTouchMoveCapture = (event: TouchEvent) => {
            if (isActiveSelectionOnTarget(event.target)) {
                event.stopImmediatePropagation();
            }
        };

        document.addEventListener('touchmove', onTouchMoveCapture, {
            passive: false,
            capture: true,
        });

        return () => {
            document.removeEventListener('touchmove', onTouchMoveCapture, {
                capture: true,
            });
        };
    }, []);
}
