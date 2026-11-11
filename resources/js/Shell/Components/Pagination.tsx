import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export default function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="mt-6 flex items-center justify-center gap-1">
            {links.map((link, i) => {
                const isPrev = i === 0;
                const isNext = i === links.length - 1;
                const isEllipsis = link.label === '...';

                let child: ReactNode = link.label;
                const ariaProps: Record<string, string | undefined> = {};

                if (isPrev) {
                    child = <ChevronLeft size={16} aria-hidden="true" />;
                    ariaProps['aria-label'] = 'Previous page';
                } else if (isNext) {
                    child = <ChevronRight size={16} aria-hidden="true" />;
                    ariaProps['aria-label'] = 'Next page';
                } else if (isEllipsis) {
                    ariaProps['aria-hidden'] = 'true';
                } else {
                    ariaProps['aria-label'] = `Page ${link.label}`;

                    if (link.active) {
                        ariaProps['aria-current'] = 'page';
                    }
                }

                return link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        className={
                            link.active
                                ? 'rounded bg-primary px-3 py-1.5 text-sm font-medium text-white'
                                : 'rounded bg-accent px-3 py-1.5 text-sm font-medium text-foreground'
                        }
                        {...ariaProps}
                    >
                        {child}
                    </Link>
                ) : (
                    <span
                        key={i}
                        className="rounded px-3 py-1.5 text-sm opacity-40"
                        {...ariaProps}
                    >
                        {child}
                    </span>
                );
            })}
        </div>
    );
}
