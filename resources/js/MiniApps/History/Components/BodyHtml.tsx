import React, { useState } from 'react';

import { useRoomOn } from '@/hooks/use-room-on';
import { internalHref, thumbnailSrc } from '@/MiniApps/History/lib/pillUrls';
import { entityIcon } from '@/Shell/linkables/entityIcon';
import LinkableIcon from '@/Shell/linkables/LinkableIcon';

/* A linked thing as it is now (LinkedThings on the server), keyed "type:id". */
export type LinkedThing = {
    thumbnail_url?: string | null;
    icon?: string | null;
};

export type LinkedThings = Record<string, LinkedThing>;

type BodyHtmlProps = {
    html: string | null;
    /* What the story's links point at now; a link missing here draws what was written. */
    links?: LinkedThings;
    /** The level of the heading the story sits under; its own headings rank below it. */
    headingBase?: number;
};

const HEADING_TAGS = new Set(['h1', 'h2', 'h3']);

// Allowlist of pass-through tags. Mirrors SanitizeBodyHtml's HTMLPurifier
// HTML.Allowed perimeter; the corner-link span is handled separately.
const ALLOWED_TAGS = new Set([
    'p',
    'br',
    'strong',
    'em',
    'h1',
    'h2',
    'h3',
    'a',
    'ul',
    'ol',
    'li',
]);

function CornerLinkRead({
    type,
    title,
    thumbnail,
    href,
    icon,
    current,
}: {
    type: string | null;
    title: string;
    thumbnail: string;
    href: string;
    icon: string | null;
    current: LinkedThing | undefined;
}) {
    const label = title || 'Corner link';
    const cornerOn = useRoomOn('our-corner');
    const safeHref = cornerOn ? internalHref(href) : null;
    const [thumbnailBroken, setThumbnailBroken] = useState(false);
    // Corner's pictures are served by Corner, so they go with it when the room is off.
    // The thing's picture now, not the one written into the story, which may since have
    // changed, gone, or come from a site the page may no longer load from.
    const picture = current ? (current.thumbnail_url ?? '') : thumbnail;
    const mark = current?.icon ?? icon;
    const safeThumbnail =
        cornerOn && !thumbnailBroken ? thumbnailSrc(picture) : null;
    const iconEl = mark ? (
        <LinkableIcon name={mark} size={14} />
    ) : (
        React.createElement(entityIcon(type), { size: 14, 'aria-hidden': true })
    );

    const inner = (
        <>
            <span className="tt-pill-glyph" aria-hidden="true">
                {iconEl}
            </span>
            {safeThumbnail ? (
                <img
                    src={safeThumbnail}
                    alt=""
                    className="history-body-pill-thumb"
                    onError={() => setThumbnailBroken(true)}
                />
            ) : null}
            {label}
        </>
    );

    if (safeHref) {
        return (
            <a
                className="tt-pill"
                href={safeHref}
                onClick={(e) => e.stopPropagation()}
            >
                {inner}
            </a>
        );
    }

    return <span className="tt-pill cursor-default">{inner}</span>;
}

function renderNode(
    node: Node,
    key: string,
    headingBase: number,
    links: LinkedThings,
): React.ReactNode {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'span' && el.hasAttribute('data-corner-type')) {
        return (
            <CornerLinkRead
                key={key}
                type={el.getAttribute('data-corner-type')}
                title={el.getAttribute('data-corner-title') ?? ''}
                thumbnail={el.getAttribute('data-corner-thumbnail') ?? ''}
                href={el.getAttribute('data-corner-href') ?? ''}
                icon={el.getAttribute('data-corner-icon')}
                current={
                    links[
                        `${el.getAttribute('data-corner-type')}:${el.getAttribute('data-corner-id')}`
                    ]
                }
            />
        );
    }

    // Non-allowlisted tag → collapse to its text content (defensive; never
    // emit an unknown tag, and do NOT recurse — textContent already includes
    // descendant text).
    if (!ALLOWED_TAGS.has(tag)) {
        return el.textContent;
    }

    if (tag === 'br') {
        return React.createElement('br', { key });
    }

    // Build explicit, per-tag props. NEVER spread/copy raw DOM attributes —
    // that reintroduces the class→className console.error failure mode.
    let props: Record<string, unknown> = { key };

    if (tag === 'a') {
        const href = el.getAttribute('href') ?? undefined;
        const title = el.getAttribute('title') ?? undefined;
        const target = el.getAttribute('target') ?? undefined;
        let rel = el.getAttribute('rel') ?? undefined;

        if (target === '_blank') {
            rel = 'noopener noreferrer';
        }

        props = { key, href, title, target, rel };
    }

    const children = Array.from(el.childNodes).map((child, i) =>
        renderNode(child, `${key}-${i}`, headingBase, links),
    );

    if (HEADING_TAGS.has(tag)) {
        // The editor writes h2 and h3 (h1 reads as h2). The look stays with the written rank; the
        // element moves down so the outline has no jumps under the card or sheet title.
        const rank = tag === 'h3' ? 2 : 1;

        return React.createElement(
            `h${Math.min(6, headingBase + rank)}`,
            { key, className: `history-prose-h${rank + 1}` },
            ...children,
        );
    }

    return React.createElement(tag, props, ...children);
}

export default function BodyHtml({
    html,
    headingBase = 1,
    links = {},
}: BodyHtmlProps) {
    if (!html) {
        return null;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.childNodes).map((child, i) =>
        renderNode(child, `n-${i}`, headingBase, links),
    );

    return <div className="history-prose">{children}</div>;
}
