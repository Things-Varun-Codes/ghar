import { Head, Link, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import * as rooms from '@/routes/admin/rooms';
import DesktopIcon from '@/Shell/Components/DesktopIcon';
import EmptyState from '@/Shell/Components/EmptyState';
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

type SharedProps = {
    auth: { user: { name: string; roles?: string[] } | null };
    miniApps: MiniApp[];
    summaries?: Record<string, string>;
    previews?: Record<string, MiniAppPreview>;
};

export default function Dashboard() {
    const { props } = usePage<SharedProps>();
    const trimmedName = (props.auth.user?.name ?? '').trim();
    const miniApps = props.miniApps ?? [];
    const isAdmin = props.auth.user?.roles?.includes('admin') ?? false;

    const now = new Date();
    const text = greetingFor(now.getHours());
    const greeting = `${text}${trimmedName ? ', ' + trimmedName : ''}`;

    return (
        <>
            <Head title="Home" />

            <div className="os-home">
                <header className="os-home-greeting">
                    <h1>{greeting}</h1>
                    {miniApps.length > 0 && <p>Here's what's new at home.</p>}
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
                ) : isAdmin ? (
                    <EmptyState
                        title="This home has no rooms yet"
                        body="Choose the ones you want. You can change them whenever you like."
                        action={
                            <Button asChild className="shell-press">
                                <Link href={rooms.index.url()}>
                                    Choose rooms
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <EmptyState
                        title="Nothing here yet"
                        body="Rooms show up here once an admin turns them on."
                    />
                )}
            </div>
        </>
    );
}
