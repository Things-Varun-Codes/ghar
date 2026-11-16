import type { ReactNode } from 'react';

import BackChevron from '@/Shell/Components/BackChevron';
import type { BackTarget } from '@/Shell/Components/BackChevron';
import { useInShellChrome } from '@/Shell/Layouts/shell-chrome';

type PageHeaderProps = {
    backChevron?: boolean;
    back?: BackTarget;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
};

export default function PageHeader({
    backChevron,
    back,
    eyebrow,
    title,
    subtitle,
    actions,
}: PageHeaderProps) {
    // Below `lg` the shell's top bar carries the back control, so the in-page one would repeat it.
    const topBarHasBack = useInShellChrome();
    const showBack = backChevron || back !== undefined;
    const showEyebrowRow = showBack || eyebrow;

    const rowClass = [
        'mb-2 items-center gap-1.5',
        topBarHasBack && !eyebrow ? 'hidden lg:flex' : 'flex',
    ].join(' ');

    return (
        <header className="relative z-[1] pb-6">
            {showEyebrowRow && (
                <div className={rowClass}>
                    {showBack && (
                        <span
                            className={
                                topBarHasBack
                                    ? 'hidden lg:contents'
                                    : 'contents'
                            }
                        >
                            <BackChevron
                                inline
                                back={back}
                                showLabel={!eyebrow}
                            />
                        </span>
                    )}
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
