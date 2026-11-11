import { Head } from '@inertiajs/react';

import ChallanActions from '@/MiniApps/Mailbox/Components/ChallanActions';
import ChallanArtifact from '@/MiniApps/Mailbox/Components/ChallanArtifact';
import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import Page from '@/Shell/Components/Page';
import AppLayout from '@/Shell/Layouts/AppLayout';

type Props = {
    challan: ChallanPayload;
};

export default function ChallansShow({ challan }: Props) {
    return (
        <AppLayout>
            <Head title={`${challan.ref_no ?? 'Citation'} · Our Mailbox`} />
            <MailboxLayout>
                <Page
                    tier="app"
                    className="mailbox-artifact-page"
                    title="Challan"
                    backChevron
                >
                    <div className="mx-auto my-0 max-w-[640px]">
                        <ChallanArtifact challan={challan} />
                        <div className="mt-5">
                            <ChallanActions challan={challan} />
                        </div>
                    </div>
                </Page>
            </MailboxLayout>
        </AppLayout>
    );
}
