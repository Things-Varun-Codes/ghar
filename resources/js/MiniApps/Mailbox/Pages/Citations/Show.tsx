import CitationActions from '@/MiniApps/Mailbox/Components/CitationActions';
import CitationArtifact from '@/MiniApps/Mailbox/Components/CitationArtifact';
import type { CitationPayload } from '@/MiniApps/Mailbox/Components/CitationCard';
import MailboxLayout from '@/MiniApps/Mailbox/Layouts/MailboxLayout';
import { index } from '@/routes/apps/our-mailbox/citations';
import Page from '@/Shell/Components/Page';

type Props = {
    citation: CitationPayload;
};

export default function CitationsShow({ citation }: Props) {
    return (
        <MailboxLayout>
            <Page
                tier="app"
                className="mailbox-artifact-page"
                title="Citation"
                room="Our Mailbox"
                documentTitle={`Citation ${citation.ref_no ?? ''}`.trim()}
                back={{ href: index.url(), label: 'Citations' }}
            >
                <div className="mx-auto my-0 max-w-[640px]">
                    <CitationArtifact citation={citation} />
                    <div className="mt-6">
                        <CitationActions citation={citation} />
                    </div>
                </div>
            </Page>
        </MailboxLayout>
    );
}
