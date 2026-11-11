import { Head, Link } from '@inertiajs/react';

import { dashboard } from '@/routes';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';

type Props = {
    status: number;
};

const COPY: Record<number, { title: string; body: string }> = {
    403: {
        title: 'Not yours to open',
        body: 'This page belongs to someone else.',
    },
    404: {
        title: 'Nothing here',
        body: "This page doesn't exist or was removed.",
    },
};

export default function ErrorPage({ status }: Props) {
    const copy = COPY[status] ?? COPY[404];

    return (
        <AppLayout>
            <Head title={copy.title} />

            <Page tier="prose" title={copy.title}>
                <p className="shell-error-body">{copy.body}</p>
                <p className="mt-6">
                    <Link
                        href={dashboard().url}
                        className="shell-focus shell-error-action"
                    >
                        Back to home
                    </Link>
                </p>
            </Page>
        </AppLayout>
    );
}
