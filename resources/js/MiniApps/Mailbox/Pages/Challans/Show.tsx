import ChallanActions from '@/MiniApps/Mailbox/Components/ChallanActions';
import ChallanArtifact from '@/MiniApps/Mailbox/Components/ChallanArtifact';
import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import Page from '@/Shell/Components/Page';

type Props = {
    challan: ChallanPayload;
};

export default function ChallansShow({ challan }: Props) {
    return (
        <MailboxLayout>
            <Page
                tier="app"
                className="mailbox-artifact-page"
                title="Challan"
                room="Our Mailbox"
                documentTitle={`Challan ${challan.ref_no ?? ''}`.trim()}
                backChevron
            >
                <div className="mx-auto my-0 max-w-[640px]">
                    <ChallanArtifact challan={challan} />
                    <div className="mt-6">
                        <ChallanActions challan={challan} />
                    </div>
                </div>
            </Page>
        </MailboxLayout>
    );
}
