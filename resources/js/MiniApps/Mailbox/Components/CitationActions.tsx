import type { CitationPayload } from '@/MiniApps/Mailbox/Components/CitationCard';
import IssuedActions from '@/MiniApps/Mailbox/Components/IssuedActions';
import { destroy, pay } from '@/routes/apps/our-exchange/citations';

export default function CitationActions({
    citation,
    variant = 'detail',
}: {
    citation: CitationPayload;
    variant?: 'row' | 'detail';
}) {
    const can = citation.available_actions;

    return (
        <IssuedActions
            noun="citation"
            subject={citation.offence}
            variant={variant}
            actions={
                can.includes('pay')
                    ? [
                          {
                              kind: 'pay',
                              label: 'Pay penalty',
                              busyText: 'Paying…',
                              verb: 'Pay penalty for',
                              url: pay.url(citation.id),
                              tone: 'primary',
                              confirm: {
                                  title: 'Pay this penalty?',
                                  description: `The penalty is “${citation.penalty}”. Once it's paid, this citation is settled for good.`,
                                  cancelLabel: 'Not yet',
                                  confirmLabel: 'Pay penalty',
                              },
                          },
                      ]
                    : []
            }
            deleteUrl={
                can.includes('delete') ? destroy.url(citation.id) : undefined
            }
        />
    );
}
