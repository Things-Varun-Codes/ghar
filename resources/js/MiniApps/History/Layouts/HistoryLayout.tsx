import type { ReactNode } from 'react';

import { AppAttrsProvider } from '@/hooks/use-app-attrs';
import { calendar, gallery, timeline } from '@/routes/apps/our-history';
import Page from '@/Shell/Components/Page';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import Toolbar from '@/Shell/Components/Toolbar';

type HistoryViewTab = 'timeline' | 'gallery' | 'calendar';

const HISTORY_VIEW_TABS: Array<{ key: HistoryViewTab; label: string }> = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gallery', label: 'Gallery' },
];

const HISTORY_VIEW_ROUTES = { timeline, gallery, calendar };

function historyViewHref(key: HistoryViewTab): string {
    return HISTORY_VIEW_ROUTES[key].url();
}

type HistoryLayoutProps = {
    children: ReactNode;
    activeTab?: HistoryViewTab;
    count?: ReactNode;
    controls?: ReactNode;
};

export default function HistoryLayout({
    children,
    activeTab = 'timeline',
    count,
    controls,
}: HistoryLayoutProps) {
    const tabs = (
        <SegmentedTabs
            mode="nav"
            items={HISTORY_VIEW_TABS}
            active={activeTab}
            ariaLabel="Our History views"
            hrefFor={historyViewHref}
            prefetch
        />
    );

    const tabLabel =
        HISTORY_VIEW_TABS.find((t) => t.key === activeTab)?.label ?? 'Timeline';

    return (
        <AppAttrsProvider app="our-history">
            <div
                data-app="our-history"
                className="history-bleed bg-(--history-bg) text-(--history-ink)"
            >
                <Page
                    title="Our History"
                    room="Our History"
                    documentTitle={tabLabel}
                    backChevron
                    tabs={tabs}
                    pb="pb-0"
                >
                    {(count || controls) && (
                        <Toolbar
                            count={count}
                            controls={controls}
                            sticky
                            heightVar="--history-subtoolbar-h"
                            background="var(--history-bg)"
                        />
                    )}
                    {children}
                </Page>
            </div>
        </AppAttrsProvider>
    );
}
