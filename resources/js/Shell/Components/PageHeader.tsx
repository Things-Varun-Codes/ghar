import type { ReactNode } from 'react';

import BackChevron from '@/Shell/Components/BackChevron';

type PageHeaderProps = {
    backChevron?: boolean;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
};

export default function PageHeader({
    backChevron,
    eyebrow,
    title,
    subtitle,
    actions,
}: PageHeaderProps) {
    const showEyebrowRow = backChevron || eyebrow;

    return (
        <header className="relative z-[1] pb-6">
            {showEyebrowRow && (
                <div className="mb-2 flex items-center gap-1.5">
                    {backChevron && <BackChevron inline showLabel={!eyebrow} />}
                    {eyebrow && (
                        <span className="shell-muted-label">{eyebrow}</span>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
                <h1 className="page-h1">{title}</h1>
                {actions && (
                    <div className="flex min-w-0 items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>

            {subtitle && <p className="shell-page-subtitle">{subtitle}</p>}
        </header>
    );
}
