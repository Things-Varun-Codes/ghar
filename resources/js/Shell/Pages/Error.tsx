import { Link, usePage } from '@inertiajs/react';

import { pathOf } from '@/lib/url';
import { dashboard } from '@/routes';
import Page from '@/Shell/Components/Page';
import type { MiniApp } from '@/types/miniapp';

type Props = {
    status: number;
};

const COPY: Record<number, { title: string; body: string }> = {
    403: {
        title: "This one isn't yours to open",
        body: "It was sent to someone else, or it's for admins only.",
    },
    404: {
        title: 'Nothing here',
        body: "This page doesn't exist or was removed.",
    },
};

export default function ErrorPage({ status }: Props) {
    const copy = COPY[status] ?? COPY[404];
    const { url, props } = usePage<{ miniApps?: MiniApp[] }>();
    const path = pathOf(url);

    // Inside a room, its landing page is the nearer way back.
    const room = (props.miniApps ?? []).find(
        (app) => path !== app.route && path.startsWith(`${app.route}/`),
    );

    return (
        <>
            <Page tier="prose" title={copy.title} documentTitle={copy.title}>
                <p className="shell-error-body">{copy.body}</p>
                <p className="mt-6 flex flex-wrap gap-3">
                    {room && (
                        <Link
                            href={room.route}
                            className="shell-focus shell-press shell-error-action"
                        >
                            Go to {room.name}
                        </Link>
                    )}
                    <Link
                        href={dashboard().url}
                        className={
                            room
                                ? 'shell-focus shell-press shell-btn-outline inline-flex min-h-11 items-center rounded-full border border-(--shell-border-input) bg-(--card) px-6 text-(length:--text-small) font-medium'
                                : 'shell-focus shell-press shell-error-action'
                        }
                    >
                        Back to Home
                    </Link>
                </p>
            </Page>
        </>
    );
}
