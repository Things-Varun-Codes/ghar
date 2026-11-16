import type { ChallanPayload } from '@/MiniApps/Mailbox/Components/ChallanCard';
import {
    formatInstantDay,
    formatPlainDay,
} from '@/MiniApps/Mailbox/lib/formatDay';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';
import HeartMark from '@/Shell/Components/HeartMark';

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

            <div className="mailbox-challan-confidential">Confidential</div>
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
                        Department of the Household
                    </div>
                    <div className="mailbox-challan-sub">
                        Our Mailbox · Citations registry
                    </div>
                </div>
            </div>

            <div className="mailbox-challan-body">
                <div className="mailbox-challan-refrow">
                    <span>
                        <strong>Ref no.</strong> {challan.ref_no ?? '—'}
                    </span>
                    <span>
                        <strong>Date</strong>{' '}
                        {formatInstantDay(challan.issued_at)}
                    </span>
                </div>

                <fieldset className="mailbox-challan-fieldset">
                    <legend className="mailbox-challan-legend">
                        I · Particulars
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
                        II · Incident
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
                        <div className="mt-2">
                            <span className="mailbox-challan-field-label inline">
                                Repeat offender:
                            </span>{' '}
                            <span className="mailbox-challan-field-value">
                                Yes
                            </span>
                        </div>
                    )}
                </fieldset>

                <fieldset className="mailbox-challan-fieldset">
                    <legend className="mailbox-challan-legend">
                        III · Penalty
                    </legend>
                    <div className="mailbox-challan-penalty">
                        {challan.penalty} · payable on demand
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
                <HeartMark size={13} filled className="mailbox-challan-heart" />{' '}
                · for entertainment only · settle out of court, preferably over
                tea
            </div>
        </article>
    );
}
