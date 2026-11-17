import type { CitationPayload } from '@/MiniApps/Mailbox/Components/CitationCard';
import {
    formatInstantDay,
    formatPlainDay,
} from '@/MiniApps/Mailbox/lib/formatDay';
import { monogram } from '@/MiniApps/Mailbox/lib/monogram';
import HeartMark from '@/Shell/Components/HeartMark';

const STAMP_LABEL: Record<CitationPayload['status'], string> = {
    issued: 'Issued',
    paid: 'Paid',
};

export default function CitationArtifact({
    citation,
}: {
    citation: CitationPayload;
}) {
    return (
        <article className="mailbox-citation-doc">
            <div className="mailbox-citation-watermark" aria-hidden="true">
                <span>OC</span>
            </div>

            <div className="mailbox-citation-confidential">Confidential</div>
            <div
                className={`mailbox-citation-stamp mailbox-citation-stamp--${citation.status}`}
                aria-hidden="true"
            >
                {STAMP_LABEL[citation.status]}
            </div>

            <div className="mailbox-citation-masthead">
                <div className="mailbox-citation-seal">
                    <span className="mailbox-citation-monogram">
                        {monogram(
                            citation.issuer.name,
                            citation.recipient.name,
                        )}
                    </span>
                </div>
                <div>
                    <div className="mailbox-citation-title">
                        Department of the Household
                    </div>
                    <div className="mailbox-citation-sub">
                        Our Mailbox · Citations registry
                    </div>
                </div>
            </div>

            <div className="mailbox-citation-body">
                <div className="mailbox-citation-refrow">
                    <span>
                        <strong>Ref no.</strong> {citation.ref_no ?? '—'}
                    </span>
                    <span>
                        <strong>Date</strong>{' '}
                        {formatInstantDay(citation.issued_at)}
                    </span>
                </div>

                <fieldset className="mailbox-citation-fieldset">
                    <legend className="mailbox-citation-legend">
                        I · Particulars
                    </legend>
                    <div className="mailbox-citation-grid2">
                        <div>
                            <div className="mailbox-citation-field-label">
                                Issued by
                            </div>
                            <div className="mailbox-citation-field-value">
                                {citation.issuer.name}
                            </div>
                        </div>
                        <div>
                            <div className="mailbox-citation-field-label">
                                Accused
                            </div>
                            <div className="mailbox-citation-field-value">
                                {citation.recipient.name}
                            </div>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="mailbox-citation-fieldset">
                    <legend className="mailbox-citation-legend">
                        II · Incident
                    </legend>
                    <div className="mailbox-citation-grid2 mb-2">
                        <div>
                            <div className="mailbox-citation-field-label">
                                Place
                            </div>
                            <div className="mailbox-citation-field-value">
                                {citation.incident_place ?? '—'}
                            </div>
                        </div>
                        <div>
                            <div className="mailbox-citation-field-label">
                                Date of incident
                            </div>
                            <div className="mailbox-citation-field-value">
                                {formatPlainDay(citation.incident_date)}
                            </div>
                        </div>
                    </div>
                    <div className="mailbox-citation-field-label">
                        Offence charged
                    </div>
                    <div className="mailbox-citation-field-value mailbox-citation-field-value--hand">
                        {citation.offence}
                    </div>
                    {citation.is_repeat && (
                        <div className="mt-2">
                            <span className="mailbox-citation-field-label inline">
                                Repeat offender:
                            </span>{' '}
                            <span className="mailbox-citation-field-value">
                                Yes
                            </span>
                        </div>
                    )}
                </fieldset>

                <fieldset className="mailbox-citation-fieldset">
                    <legend className="mailbox-citation-legend">
                        III · Penalty
                    </legend>
                    <div className="mailbox-citation-penalty">
                        {citation.penalty} · payable on demand
                    </div>
                    {citation.remarks && (
                        <div className="mt-2">
                            <div className="mailbox-citation-field-label">
                                Remarks
                            </div>
                            <div className="mailbox-citation-field-value">
                                {citation.remarks}
                            </div>
                        </div>
                    )}
                </fieldset>
            </div>

            <div className="mailbox-citation-footer">
                Issued with{' '}
                <HeartMark
                    size={13}
                    filled
                    className="mailbox-citation-heart"
                />{' '}
                · for entertainment only · settle out of court, preferably over
                tea
            </div>
        </article>
    );
}
