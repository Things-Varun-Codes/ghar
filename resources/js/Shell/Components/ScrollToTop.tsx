import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Pop } from '@/components/motion';
import { scrollBehavior } from '@/lib/motion';

/*
 * "Back to the top" on every signed-in page: shows once the page is a screen and a half down, so
 * a short page never sees it. It sits just above the Fab, or in its place on a page without one.
 */
export default function ScrollToTop() {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const update = () =>
            setShown(window.scrollY > window.innerHeight * 1.5);

        update();
        window.addEventListener('scroll', update, { passive: true });

        return () => window.removeEventListener('scroll', update);
    }, []);

    return (
        <Pop show={shown} as="div" className="shell-scroll-top">
            <button
                type="button"
                aria-label="Back to the top"
                className="shell-scroll-top-button shell-press shell-focus"
                onClick={() =>
                    window.scrollTo({ top: 0, behavior: scrollBehavior() })
                }
            >
                <ArrowUp aria-hidden="true" size={20} strokeWidth={1.75} />
            </button>
        </Pop>
    );
}
