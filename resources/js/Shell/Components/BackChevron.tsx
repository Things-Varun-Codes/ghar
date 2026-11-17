import { Link, usePage } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import type { MouseEvent } from 'react';
import { defaultParent, goBack } from '@/lib/back-navigation';
import type { BackTarget } from '@/lib/back-navigation';
import { pathOf } from '@/lib/url';
import { dashboard } from '@/routes';
import type { MiniApp } from '@/types/miniapp';

export type { BackTarget };

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
    const { url, props } = usePage<{ miniApps?: MiniApp[] }>();

    const clean = pathOf(url);

    if (!back && clean === dashboard.url()) {
        return null;
    }

    const { href: parentPath, label: parentLabel } =
        back ?? defaultParent(clean, props.miniApps ?? []);

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
