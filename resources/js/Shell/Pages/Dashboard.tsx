import { Head, usePage } from '@inertiajs/react';
import DesktopIcon from '@/Shell/Components/DesktopIcon';
import EmptyState from '@/Shell/Components/EmptyState';
import AppLayout from '@/Shell/Layouts/AppLayout';
import type { MiniApp, MiniAppPreview } from '@/types/miniapp';

function greetingFor(hour: number): string {
    if (hour >= 5 && hour <= 11) {
        return 'Good morning';
    }

    if (hour >= 12 && hour <= 16) {
        return 'Good afternoon';
    }

    if (hour >= 17 && hour <= 21) {
        return 'Good evening';
    }

    return 'Still up';
}

const HOME_LINES = [
    "You're home.",
    'Have you eaten?',
    'Mind the shoes in the hallway.',
    'Nothing here is trying to sell you anything.',
    'Somebody should really water the plants.',
];

type SharedProps = {
    auth: { user: { name: string } | null };
    miniApps: MiniApp[];
    summaries?: Record<string, string>;
    previews?: Record<string, MiniAppPreview>;
};

export default function Dashboard() {
    const { props } = usePage<SharedProps>();
    const trimmedName = (props.auth.user?.name ?? '').trim();
    const miniApps = props.miniApps ?? [];

    const now = new Date();
    const text = greetingFor(now.getHours());
    const greeting = `${text}${trimmedName ? ', ' + trimmedName : ''}`;
    const dayIndex = Math.floor(
        (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000,
    );
    const homeLine = HOME_LINES[dayIndex % HOME_LINES.length];

    return (
        <AppLayout>
            <Head title="Home" />

            <div className="os-home">
                <header className="os-home-greeting">
                    <h1>{greeting}</h1>
                    <p>{homeLine}</p>
                </header>

                {miniApps.length > 0 ? (
                    <div className="os-home-doors">
                        {miniApps.map((app) => (
                            <DesktopIcon
                                key={app.slug}
                                app={app}
                                summary={props.summaries?.[app.slug]}
                                preview={props.previews?.[app.slug]}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="Nothing here yet"
                        body="New rooms appear here as they're built."
                    />
                )}
            </div>
        </AppLayout>
    );
}
