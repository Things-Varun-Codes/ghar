import { count as countOf } from '@/lib/plural';

type Props = {
    year: number;
    count: number;
};

export default function YearBanner({ year, count }: Props) {
    return (
        <div
            id={`year-${year}`}
            className="history-year-banner history-year-banner-spacing"
        >
            <h2 className="history-year-title">{year}</h2>
            <small className="history-year-count">
                {countOf(count, 'moment')}
            </small>
        </div>
    );
}
