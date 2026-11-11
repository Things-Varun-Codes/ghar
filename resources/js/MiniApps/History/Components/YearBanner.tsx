type Props = {
    year: number;
    count: number;
};

function countLabel(year: number, count: number): string {
    const currentYear = new Date().getFullYear();

    if (year === currentYear && count < 12) {
        return `${count} ${count === 1 ? 'moment' : 'moments'}`;
    }

    return `${count} ${count === 1 ? 'moment' : 'moments'}`;
}

export default function YearBanner({ year, count }: Props) {
    return (
        <div
            id={`year-${year}`}
            className="history-year-banner history-year-banner-spacing"
        >
            <h2 className="history-year-title">{year}</h2>
            <small className="history-year-count">
                {countLabel(year, count)}
            </small>
        </div>
    );
}
