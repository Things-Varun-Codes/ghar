import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ArrowUpRight, X } from 'lucide-react';
import React, { useState } from 'react';

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useAppAttrs } from '@/hooks/use-app-attrs';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import EntityPillContent, {
    PILL_FALLBACK_LABEL,
} from '@/Shell/linkables/EntityPillContent';
import { internalHref } from '@/Shell/linkables/urls';
import { useLinkTypeOn } from '@/Shell/linkables/use-linking';

export default function EntityLinkPill({
    node,
    editor,
    getPos,
}: NodeViewProps) {
    const { type, title, thumbnailUrl, deepLinkUrl, icon } = node.attrs as {
        type: string | null;
        id: number | null;
        title: string;
        thumbnailUrl: string | null;
        deepLinkUrl: string | null;
        icon: string | null;
    };

    const appAttrs = useAppAttrs();
    const [touchMenuOpen, setTouchMenuOpen] = useState(false);
    useOverlayHistory(touchMenuOpen, () => setTouchMenuOpen(false));

    const typeOn = useLinkTypeOn(type);
    const safeHref = typeOn && deepLinkUrl ? internalHref(deepLinkUrl) : null;
    const label = title || PILL_FALLBACK_LABEL;

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

    const handlePillClick = (e: React.MouseEvent) => {
        const isTouch =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(pointer: coarse)').matches;

        if (isTouch || !safeHref) {
            e.preventDefault();
        }

        if (isTouch) {
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
            <EntityPillContent
                title={title}
                icon={icon}
                thumbnail={typeOn ? thumbnailUrl : null}
                thumbClassName="shell-pill-thumb"
                label={
                    <a
                        href={safeHref ?? '#'}
                        target="_self"
                        onClick={handlePillClick}
                        aria-label={safeHref ? `Open ${label}` : label}
                        className="shell-pill-link"
                    >
                        {label}
                    </a>
                }
            />

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
                <X size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>

            <Sheet open={touchMenuOpen} onOpenChange={setTouchMenuOpen}>
                <SheetContent side="bottom" {...appAttrs}>
                    <SheetHeader>
                        <SheetTitle>{label}</SheetTitle>
                        <SheetDescription>
                            Open it, or take the link out of this story.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="shell-pill-actions">
                        {safeHref && (
                            <a
                                href={safeHref}
                                target="_self"
                                onClick={() => setTouchMenuOpen(false)}
                                className="shell-pill-open inline-flex items-center gap-1.5"
                            >
                                Open
                                <ArrowUpRight
                                    size={16}
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                />
                            </a>
                        )}
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
