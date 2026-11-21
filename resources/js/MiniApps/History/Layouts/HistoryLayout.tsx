import type { ReactNode } from 'react';

import { dashboard } from '@/routes';
import { calendar, gallery, map, timeline } from '@/routes/apps/our-history';
import Page from '@/Shell/Components/Page';
import RoomScope from '@/Shell/Components/RoomScope';
import SegmentedTabs from '@/Shell/Components/SegmentedTabs';
import Toolbar from '@/Shell/Components/Toolbar';

export const HISTORY_ROOM = 'Our History';

type HistoryViewTab = 'timeline' | 'gallery' | 'calendar' | 'map';

const HISTORY_VIEW_TABS: Array<{ key: HistoryViewTab; label: string }> = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'map', label: 'Map' },
];

const HISTORY_VIEW_ROUTES = { timeline, gallery, calendar, map };

// The views are tabs of one page, so back leaves the room rather than stepping to Timeline.
const LEAVE_ROOM = { href: dashboard.url(), label: 'Home' };

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
        <RoomScope
            slug="our-history"
            className="history-bleed bg-(--history-bg) text-(--history-ink)"
        >
            <Page
                title={HISTORY_ROOM}
                room={HISTORY_ROOM}
                documentTitle={tabLabel}
                back={LEAVE_ROOM}
                tabs={tabs}
                pb="pb-0"
            >
                {(count || controls) && (
                    <Toolbar
                        count={count}
                        controls={controls}
                        sticky={false}
                        background="var(--history-bg)"
                    />
                )}
                {children}
            </Page>
        </RoomScope>
    );
}
