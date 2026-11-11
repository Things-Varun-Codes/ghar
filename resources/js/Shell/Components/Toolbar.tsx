import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type ToolbarProps = {
    count: ReactNode;
    controls: ReactNode;
    sticky?: boolean;
    heightVar?: string;
    background?: string;
    className?: string;
};

export default function Toolbar({
    count,
    controls,
    sticky = true,
    heightVar,
    background = 'var(--shell-bg)',
    className,
}: ToolbarProps) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!heightVar) {
            return;
        }

        const el = rootRef.current;

        if (!el || typeof ResizeObserver === 'undefined') {
            return;
        }

        const publish = () => {
            document.documentElement.style.setProperty(
                heightVar,
                `${el.offsetHeight}px`,
            );
        };

        publish();
        const observer = new ResizeObserver(publish);
        observer.observe(el);

        return () => observer.disconnect();
    }, [heightVar]);

    const rootClassName = ['shell-toolbar', className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={rootRef}
            className={rootClassName}
            style={{
                backgroundColor: background,
                ...(sticky ? {} : { position: 'static' }),
            }}
        >
            <div>{count}</div>
            <div>{controls}</div>
        </div>
    );
}
