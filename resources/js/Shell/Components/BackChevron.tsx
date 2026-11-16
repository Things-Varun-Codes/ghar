import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import type { MouseEvent } from 'react';
import { goBack } from '@/lib/back-navigation';
import { dashboard } from '@/routes';

export type BackTarget = { href: string; label: string };

// Mini-app paths are literals on purpose: the shell must build with any mini app disabled.
const PARENT_LABELS: Record<string, string> = {
    '/apps/our-corner/songs': 'Songs',
    '/apps/our-corner/movies': 'Movies',
    '/apps/our-corner/places': 'Places',
    '/apps/our-corner/activities': 'Activities',
    '/apps/our-corner': 'Our Corner',
    // Mailbox comms sub-surface — resolved before the app root so a challan
    // show page (/apps/our-mailbox/challans/{id}) finds the "Challans" label,
    // not "Our Mailbox". Without a matching entry every mailbox
    // sub-page's back button would go to /dashboard via the bestMatchLen===0 fallback.
    '/apps/our-mailbox/challans': 'Challans',
    '/apps/our-mailbox/coupons': 'Coupons',
    '/apps/our-mailbox/messages': 'Notes',
    '/apps/our-mailbox/flowers': 'Flowers',
    '/apps/our-mailbox': 'Our Mailbox',
    '/apps/our-history': 'Our History',
    [dashboard.url()]: 'Home',
};

function resolveParent(pathname: string): {
    path: string;
    label: string;
    matched: boolean;
} {
    const clean = pathname.replace(/\/$/, '') || '/';

    if (clean === dashboard.url()) {
        return { path: dashboard.url(), label: 'Home', matched: false };
    }

    if (clean.startsWith('/apps/our-history/')) {
        return { path: dashboard.url(), label: 'Home', matched: false };
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
        return { path: dashboard.url(), label: 'Home', matched: false };
    }

    return { path: parentPath, label, matched: true };
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
    showLabel = true,
    back,
}: {
    inline?: boolean;
    showLabel?: boolean;
    /** An explicit parent, for pages whose URL doesn't name it (an admin edit page). */
    back?: BackTarget;
}) {
    const { url } = usePage();

    const pathname = url.split('?')[0];
    const clean = pathname.replace(/\/$/, '') || '/';

    if (!back && (clean === dashboard.url() || clean === '')) {
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
                aria-label={showLabel ? undefined : `Back to ${parentLabel}`}
                className="shell-focus shell-back-inline"
            >
                <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
                {showLabel && (
                    <span className="shell-muted-label">
                        <span className="sr-only">Back to </span>
                        {parentLabel}
                    </span>
                )}
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
