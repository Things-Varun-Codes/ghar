import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Pagination as PaginationNav,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink as PageLink,
} from '@/components/ui/pagination';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

/* Laravel's paginator links: previous, the pages (with '...' gaps), next. */
export default function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <PaginationNav className="mt-6">
            <PaginationContent>
                {links.map((link, i) => {
                    const isPrev = i === 0;
                    const isNext = i === links.length - 1;

                    if (!isPrev && !isNext && link.label === '...') {
                        return (
                            <PaginationItem key={i}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        );
                    }

                    const label = isPrev
                        ? 'Previous page'
                        : isNext
                          ? 'Next page'
                          : `Page ${link.label}`;
                    const content = isPrev ? (
                        <ChevronLeft strokeWidth={1.5} aria-hidden="true" />
                    ) : isNext ? (
                        <ChevronRight strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                        link.label
                    );

                    return (
                        <PaginationItem key={i}>
                            {link.url ? (
                                <PageLink
                                    render={<Link href={link.url} />}
                                    isActive={link.active}
                                    aria-label={label}
                                >
                                    {content}
                                </PageLink>
                            ) : (
                                <span
                                    aria-label={label}
                                    aria-disabled="true"
                                    className="flex size-11 items-center justify-center opacity-40"
                                >
                                    {content}
                                </span>
                            )}
                        </PaginationItem>
                    );
                })}
            </PaginationContent>
        </PaginationNav>
    );
}
