import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
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
    /*
     * Below `lg` the shell's top bar already shows the title, so it isn't repeated here, unless
     * it's too long for that bar (about 18 characters on a 320px phone) and would be cut short.
     */
    const hideTitle = title.length <= 18;

    return (
        <header
            className={cn(
                'relative z-[1] pb-6',
                hideTitle &&
                    !subtitle &&
                    (actions ? 'max-lg:pb-4' : 'max-lg:pb-0'),
            )}
        >
            {/* Below `lg` the shell's top bar carries the back control. */}
            {showBack && (
                <div className="mb-2 hidden items-center gap-1.5 lg:flex">
                    <BackChevron inline back={back} />
                </div>
            )}

            <div
                className={cn(
                    'flex flex-wrap items-start justify-between gap-4',
                    hideTitle && 'max-lg:justify-end',
                )}
            >
                <h1 className={cn('page-h1', hideTitle && 'max-lg:sr-only')}>
                    {title}
                </h1>
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
