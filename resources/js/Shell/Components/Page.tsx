import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { pageTitle } from '@/lib/title';
import type { BackTarget } from '@/Shell/Components/BackChevron';
import PageHeader from '@/Shell/Components/PageHeader';
import { usePublishShellPage } from '@/Shell/Layouts/shell-chrome';

type PageProps = {
    tier?: 'prose' | 'index' | 'app';
    title: string;
    subtitle?: string;
    backChevron?: boolean;
    /** An explicit back target; implies a back control. */
    back?: BackTarget;
    /**
     * Sets the document title to "{documentTitle ?? title} · {room}". Leave both unset when
     * the page renders its own <Head>.
     */
    room?: string;
    documentTitle?: string;
    actions?: ReactNode;
    tabs?: ReactNode;
    children: ReactNode;
    /**
     * A fixed-position FAB (`Fab`). When present, `Page` auto-applies
     * `pb-[120px]` bottom clearance — do not also pass `pb` alongside `fab`.
     */
    fab?: ReactNode;
    pb?: string;
    className?: string;
};

const TIER_MAX_WIDTH: Record<NonNullable<PageProps['tier']>, string> = {
    prose: 'max-w-[720px]',
    index: 'max-w-[1180px]',
    app: '',
};

export default function Page({
    tier = 'index',
    title,
    subtitle,
    backChevron,
    back,
    room,
    documentTitle,
    actions,
    tabs,
    children,
    fab,
    pb = 'pb-8',
    className,
}: PageProps) {
    usePublishShellPage(title, back);

    const effectivePb = fab ? 'pb-[120px]' : pb;

    const containerClass = [
        TIER_MAX_WIDTH[tier],
        'pt-2 lg:pt-8',
        effectivePb,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={containerClass}>
            {(room !== undefined || documentTitle !== undefined) && (
                <Head title={pageTitle(documentTitle ?? title, room)} />
            )}
            <PageHeader
                title={title}
                subtitle={subtitle}
                backChevron={backChevron}
                back={back}
                actions={actions}
            />
            {/* One tall box for tabs and children, so a sticky element in either sticks for the
             * whole page. Wrapping the tabs in their own box would cut that short. */}
            <div>
                {tabs}
                {children}
            </div>
            {fab}
        </div>
    );
}
