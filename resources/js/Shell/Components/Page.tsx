import type { ReactNode } from 'react';

import PageHeader from '@/Shell/Components/PageHeader';

type PageProps = {
    tier?: 'prose' | 'index' | 'app';
    title: string;
    eyebrow?: string;
    subtitle?: string;
    backChevron?: boolean;
    actions?: ReactNode;
    belowHeader?: ReactNode;
    tabs?: ReactNode;
    children: ReactNode;
    /**
     * A fixed-position FAB (`Fab`). When present, `Page` auto-applies
     * `pb-[120px]` bottom clearance — do not also pass `pb` alongside `fab`.
     */
    fab?: ReactNode;
    pb?: string;
    bleed?: boolean;
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
    eyebrow,
    subtitle,
    backChevron,
    actions,
    belowHeader,
    tabs,
    children,
    fab,
    pb = 'pb-8',
    bleed = false,
    className,
}: PageProps) {
    const effectivePb = fab ? 'pb-[120px]' : pb;

    const containerClass = [
        TIER_MAX_WIDTH[tier],
        bleed ? '' : 'sm:px-8',
        'pt-2 sm:pt-8',
        effectivePb,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={containerClass}>
            <PageHeader
                title={title}
                eyebrow={eyebrow}
                subtitle={subtitle}
                backChevron={backChevron}
                actions={actions}
            />
            {belowHeader && <div className="mb-6">{belowHeader}</div>}
            {/* tabs renders as a sibling of children inside the tall content
             * div — containing-block safe for any sticky descendant
             * Do NOT wrap in a marginBottom-only
             * box here. */}
            <div>
                {tabs}
                {children}
            </div>
            {fab}
        </div>
    );
}
