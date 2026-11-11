import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { entityIcon } from '@/Shell/linkables/entityIcon';

export default function EntityLinkPill({
    node,
    editor,
    getPos,
}: NodeViewProps) {
    const { type, title, thumbnailUrl, deepLinkUrl } = node.attrs as {
        type: string | null;
        id: number | null;
        title: string;
        thumbnailUrl: string | null;
        deepLinkUrl: string | null;
    };

    const [touchMenuOpen, setTouchMenuOpen] = useState(false);

    const remove = () => {
        if (typeof getPos !== 'function') {
            return;
        }

        const pos = getPos();

        if (typeof pos !== 'number') {
            return;
        }

        editor
            .chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
    };

    const safeHref = deepLinkUrl ?? '#';
    const label = title || 'Corner link';

    const iconEl = React.createElement(entityIcon(type), {
        size: 14,
        'aria-hidden': true,
    });

    const handlePillClick = (e: React.MouseEvent) => {
        const isTouch =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(pointer: coarse)').matches;

        if (isTouch) {
            e.preventDefault();
            setTouchMenuOpen(true);
        }
    };

    return (
        <NodeViewWrapper
            as="span"
            className="tt-pill"
            contentEditable={false}
            data-corner-type={type ?? ''}
            data-corner-title={title}
        >
            <span className="tt-pill-glyph" aria-hidden="true">
                {iconEl}
            </span>

            {thumbnailUrl && (
                <img src={thumbnailUrl} alt="" className="shell-pill-thumb" />
            )}

            <a
                href={safeHref}
                target="_self"
                onClick={handlePillClick}
                aria-label={`Open ${label} in Our Corner`}
                className="shell-pill-link"
            >
                {label}
            </a>

            <button
                type="button"
                className="tt-pill-remove"
                aria-label={`Remove link to ${label}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove();
                }}
            >
                ×
            </button>

            <Sheet open={touchMenuOpen} onOpenChange={setTouchMenuOpen}>
                <SheetContent side="bottom" data-app="our-corner">
                    <SheetHeader>
                        <SheetTitle>{label}</SheetTitle>
                        <SheetDescription>
                            Choose an action for this Corner link.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="shell-pill-actions">
                        <a
                            href={safeHref}
                            target="_self"
                            onClick={() => setTouchMenuOpen(false)}
                            className="shell-pill-open"
                        >
                            Open in Corner ↗
                        </a>
                        <button
                            type="button"
                            onClick={() => {
                                setTouchMenuOpen(false);
                                remove();
                            }}
                            className="shell-pill-remove"
                        >
                            Remove link
                        </button>
                        <button
                            type="button"
                            onClick={() => setTouchMenuOpen(false)}
                            className="shell-pill-cancel"
                        >
                            Cancel
                        </button>
                    </div>
                </SheetContent>
            </Sheet>
        </NodeViewWrapper>
    );
}
