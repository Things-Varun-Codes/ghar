import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import type { MouseEvent } from 'react';
import { goBack } from '@/lib/back-navigation';
import { pathOf } from '@/lib/url';
import { dashboard } from '@/routes';

export type BackTarget = { href: string; label: string };

// Mini-app paths are literals on purpose: the shell must build with any mini app disabled.
const PARENT_LABELS: Record<string, string> = {
    '/apps/our-corner/songs': 'Songs',
    '/apps/our-corner/movies': 'Movies',
    '/apps/our-corner/places': 'Places',
    '/apps/our-corner/activities': 'Activities',
    '/apps/our-corner': 'Our Corner',
    // A parent with no entry here falls back to Home, so every Mailbox list needs one.
    '/apps/our-mailbox/challans': 'Challans',
    '/apps/our-mailbox/coupons': 'Coupons',
    '/apps/our-mailbox/messages': 'Notes',
    '/apps/our-mailbox/flowers': 'Flowers',
    '/apps/our-mailbox': 'Our Mailbox',
    '/apps/our-history': 'Our History',
    [dashboard.url()]: 'Home',
};

function resolveParent(clean: string): { path: string; label: string } {
    if (clean === dashboard.url()) {
        return { path: dashboard.url(), label: 'Home' };
    }

    if (clean.startsWith('/apps/our-history/')) {
        return { path: dashboard.url(), label: 'Home' };
    }

    const segments = clean.split('/').filter(Boolean);
    segments.pop();
    const parentPath =
        segments.length > 0 ? '/' + segments.join('/') : dashboard.url();

    let label = 'previous page';
    let bestMatchLen = 0;

    for (const [prefix, name] of Object.entries(PARENT_LABELS)) {
        if (parentPath.startsWith(prefix) && prefix.length > bestMatchLen) {
            bestMatchLen = prefix.length;
            label = name;
        }
    }

    // If no known prefix matched, fall back to /dashboard so navigation is never
    // a 404. This covers '/apps', '/settings', and '/admin' — none have a real GET
    // index route (the latter two are sidebar section headers), so their sub-pages
    // land back on Home.
    if (bestMatchLen === 0) {
        return { path: dashboard.url(), label: 'Home' };
    }

    return { path: parentPath, label };
}

function isPlainClick(event: MouseEvent<Element>): boolean {
    return !(
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    );
}

export default function BackChevron({
    inline = false,
    back,
}: {
    inline?: boolean;
    /** An explicit parent, for pages whose URL doesn't name it (an admin edit page). */
    back?: BackTarget;
}) {
    const { url } = usePage();

    const clean = pathOf(url);

    if (!back && clean === dashboard.url()) {
        return null;
    }

    const { path: parentPath, label: parentLabel } = back
        ? { path: back.href, label: back.label }
        : resolveParent(clean);

    const onClick = (event: MouseEvent<Element>) => {
        if (!isPlainClick(event)) {
            return;
        }

        event.preventDefault();
        goBack(parentPath);
    };

    if (inline) {
        return (
            <Link
                href={parentPath}
                onClick={onClick}
                className="shell-focus shell-back-inline"
            >
                <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
                <span className="shell-muted-label">
                    <span className="sr-only">Back to </span>
                    {parentLabel}
                </span>
            </Link>
        );
    }

    return (
        <Link
            href={parentPath}
            onClick={onClick}
            aria-label={`Back to ${parentLabel}`}
            className="shell-focus shell-back-floating flex items-center justify-center rounded-lg"
        >
            <ChevronLeft size={24} strokeWidth={1.5} aria-hidden="true" />
        </Link>
    );
}
