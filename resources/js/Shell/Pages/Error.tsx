import { Link, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
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
                        <Button
                            nativeButton={false}
                            render={<Link href={room.route} />}
                            className="shell-press"
                        >
                            Go to {room.name}
                        </Button>
                    )}
                    <Button
                        nativeButton={false}
                        render={<Link href={dashboard().url} />}
                        variant={room ? 'outline' : 'default'}
                        className="shell-press"
                    >
                        Back to Home
                    </Button>
                </p>
            </Page>
        </>
    );
}
