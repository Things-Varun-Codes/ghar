import type { ReactNode } from 'react';

import BackChevron from '@/Shell/Components/BackChevron';
import type { BackTarget } from '@/Shell/Components/BackChevron';

type PageHeaderProps = {
    backChevron?: boolean;
    back?: BackTarget;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
};

export default function PageHeader({
    backChevron,
    back,
    title,
    subtitle,
    actions,
}: PageHeaderProps) {
    const showBack = backChevron || back !== undefined;

    return (
        <header className="relative z-[1] pb-6">
            {/* Below `lg` the shell's top bar carries the back control. */}
            {showBack && (
                <div className="mb-2 hidden items-center gap-1.5 lg:flex">
                    <BackChevron inline back={back} />
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
