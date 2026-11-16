import { useEffect, useRef, useState } from 'react';
import { scrollBehavior } from '@/lib/motion';

type Props = {
    years: number[]; // descending (newest first)
};

export default function YearJumpRail({ years }: Props) {
    const [activeYear, setActiveYear] = useState<number | null>(
        years[0] ?? null,
    );
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (years.length === 0) {
            return;
        }

        const entries: Map<number, boolean> = new Map();

        observerRef.current = new IntersectionObserver(
            (observed) => {
                for (const entry of observed) {
                    const yearAttr = entry.target.getAttribute('id');

                    if (!yearAttr) {
                        continue;
                    }

                    const year = parseInt(yearAttr.replace('year-', ''), 10);

                    if (!isNaN(year)) {
                        entries.set(year, entry.isIntersecting);
                    }
                }

                const visible = years.find((y) => entries.get(y) === true);

                if (visible !== undefined) {
                    setActiveYear(visible);
                }
            },
            {
                rootMargin: '-32px 0px -80% 0px',
                threshold: 0,
            },
        );

        for (const year of years) {
            const el = document.getElementById(`year-${year}`);

            if (el) {
                observerRef.current.observe(el);
            }
        }

        return () => {
            observerRef.current?.disconnect();
        };
    }, [years]);

    if (years.length < 2) {
        return null;
    }

    function scrollToYear(year: number) {
        const el = document.getElementById(`year-${year}`);

        if (el) {
            el.scrollIntoView({
                behavior: scrollBehavior(),
                block: 'start',
            });
        }
    }

    return (
        <nav
            aria-label="Jump to year"
            className="history-year-rail history-year-rail-nav"
        >
            {years.map((year) => {
                const isActive = year === activeYear;

                return (
                    <button
                        key={year}
                        type="button"
                        onClick={() => scrollToYear(year)}
                        aria-label={`Jump to ${year}`}
                        aria-pressed={isActive}
                        className="history-year-rail-button"
                    >
                        {year}
                    </button>
                );
            })}
        </nav>
    );
}
