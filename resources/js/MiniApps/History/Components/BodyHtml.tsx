import React from 'react';

import { internalHref, thumbnailSrc } from '@/MiniApps/History/lib/pillUrls';
import { entityIcon } from '@/Shell/linkables/entityIcon';

type BodyHtmlProps = {
    html: string | null;
};

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
}: {
    type: string | null;
    title: string;
    thumbnail: string;
    href: string;
}) {
    const label = title || 'Corner link';
    const safeHref = internalHref(href);
    const safeThumbnail = thumbnailSrc(thumbnail);
    const iconEl = React.createElement(entityIcon(type), {
        size: 14,
        'aria-hidden': true,
    });

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

function renderNode(node: Node, key: string): React.ReactNode {
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
        renderNode(child, `${key}-${i}`),
    );

    return React.createElement(tag, props, ...children);
}

export default function BodyHtml({ html }: BodyHtmlProps) {
    if (!html) {
        return null;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const children = Array.from(doc.body.childNodes).map((child, i) =>
        renderNode(child, `n-${i}`),
    );

    return <div className="history-prose">{children}</div>;
}
