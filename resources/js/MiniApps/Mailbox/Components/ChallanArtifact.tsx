import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import {
    formatInstantDay,
    formatPlainDay,
} from '@/MiniApps/Mailbox/lib/formatDay';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';

const STAMP_LABEL: Record<ChallanPayload['status'], string> = {
    issued: 'Issued',
    paid: 'Paid',
};

export default function ChallanArtifact({
    challan,
}: {
    challan: ChallanPayload;
}) {
    return (
        <article className="mailbox-challan-doc">
            <div className="mailbox-challan-watermark" aria-hidden="true">
                <span>OC</span>
            </div>

            <div className="mailbox-challan-confidential">CONFIDENTIAL</div>
            <div
                className={`mailbox-challan-stamp mailbox-challan-stamp--${challan.status}`}
                aria-hidden="true"
            >
                {STAMP_LABEL[challan.status]}
            </div>

            <div className="mailbox-challan-masthead">
                <div className="mailbox-challan-seal">
                    <span className="mailbox-challan-monogram">
                        {monogram(challan.issuer.name, challan.recipient.name)}
                    </span>
                </div>
                <div>
                    <div className="mailbox-challan-title">
                        DEPARTMENT OF THE HOUSEHOLD
                    </div>
                    <div className="mailbox-challan-sub">
                        OUR MAILBOX · CITATIONS REGISTRY
                    </div>
                </div>
            </div>

            <div className="mailbox-challan-body">
                <div className="mailbox-challan-refrow">
                    <span>
                        <strong>REF NO:</strong> {challan.ref_no ?? '—'}
                    </span>
                    <span>
                        <strong>DATE:</strong>{' '}
                        {formatInstantDay(challan.issued_at)}
                    </span>
                </div>

                <fieldset className="mailbox-challan-fieldset">
                    <legend className="mailbox-challan-legend">
                        I · PARTICULARS
                    </legend>
                    <div className="mailbox-challan-grid2">
                        <div>
                            <div className="mailbox-challan-field-label">
                                Issued by
                            </div>
                            <div className="mailbox-challan-field-value">
                                {challan.issuer.name}
                            </div>
                        </div>
                        <div>
                            <div className="mailbox-challan-field-label">
                                Accused
                            </div>
                            <div className="mailbox-challan-field-value">
                                {challan.recipient.name}
                            </div>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="mailbox-challan-fieldset">
                    <legend className="mailbox-challan-legend">
                        II · INCIDENT
                    </legend>
                    <div className="mailbox-challan-grid2 mb-2">
                        <div>
                            <div className="mailbox-challan-field-label">
                                Place
                            </div>
                            <div className="mailbox-challan-field-value">
                                {challan.incident_place ?? '—'}
                            </div>
                        </div>
                        <div>
                            <div className="mailbox-challan-field-label">
                                Date of incident
                            </div>
                            <div className="mailbox-challan-field-value">
                                {formatPlainDay(challan.incident_date)}
                            </div>
                        </div>
                    </div>
                    <div className="mailbox-challan-field-label">
                        Offence charged
                    </div>
                    <div className="mailbox-challan-field-value mailbox-challan-field-value--hand">
                        {challan.offence}
                    </div>
                    {challan.is_repeat && (
                        <div className="mt-1.5">
                            <span className="mailbox-challan-field-label inline">
                                Repeat offender:
                            </span>{' '}
                            <span className="mailbox-challan-field-value font-(family-name:--mailbox-challan-font)">
                                YES
                            </span>
                        </div>
                    )}
                </fieldset>

                <fieldset className="mailbox-challan-fieldset">
                    <legend className="mailbox-challan-legend">
                        III · PENALTY
                    </legend>
                    <div className="mailbox-challan-penalty">
                        {challan.penalty.toUpperCase()} · payable on demand
                    </div>
                    {challan.remarks && (
                        <div className="mt-2">
                            <div className="mailbox-challan-field-label">
                                Remarks
                            </div>
                            <div className="mailbox-challan-field-value">
                                {challan.remarks}
                            </div>
                        </div>
                    )}
                </fieldset>
            </div>

            <div className="mailbox-challan-footer">
                Issued with{' '}
                <span className="mailbox-challan-heart" aria-hidden="true">
                    ♥
                </span>{' '}
                · for entertainment only · settle out of court, preferably over
                tea
            </div>
        </article>
    );
}
