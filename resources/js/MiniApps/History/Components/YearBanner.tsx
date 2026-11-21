import { ChevronDown } from 'lucide-react';
import { count as countOf } from '@/lib/plural';
import ChoiceMenu from '@/Shell/Components/ChoiceMenu';

type Props = {
    year: number;
    count: number;
    /* Every year with moments, in the timeline's order, and how many each has. */
    years: Array<{ year: number; count: number }>;
    onJump: (year: number) => void;
};

/* The year heading. With more than one year it is also the way to jump to another. */
export default function YearBanner({ year, count, years, onJump }: Props) {
    return (
        <div className="history-year-banner history-year-banner-spacing">
            <h2 className="history-year-title">
                {years.length > 1 ? (
                    <ChoiceMenu
                        label="Year"
                        value={String(year)}
                        items={years.map((y) => ({
                            key: String(y.year),
                            label: String(y.year),
                            hint: countOf(y.count, 'moment'),
                        }))}
                        onSelect={(key) => onJump(Number(key))}
                        align="start"
                        movesPage
                        trigger={
                            <>
                                {year}
                                <span className="sr-only">
                                    , pick a year to jump to
                                </span>
                                <ChevronDown
                                    aria-hidden="true"
                                    size={22}
                                    strokeWidth={1.5}
                                    className="history-year-jump-chevron"
                                />
                            </>
                        }
                        classNames={{
                            trigger: 'history-year-jump shell-press',
                            menu: 'history-year-menu',
                            item: 'history-year-item',
                            itemLabel: 'font-sans text-(length:--text-body)',
                            hint: 'history-sort-hint',
                            check: 'text-(--history-accent-ink-strong)',
                        }}
                    />
                ) : (
                    year
                )}
            </h2>
            <small className="history-year-count">
                {countOf(count, 'moment')}
            </small>
        </div>
    );
}
