import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
    variant?: 'list' | 'note';
    base?: string;
    className?: string;
    children: ReactNode;
    style?: CSSProperties;
    'data-app'?: string;
};

export default function AppCard({
    variant = 'list',
    base = 'corner-card',
    className,
    children,
    style,
    'data-app': dataApp,
    ...rest
}: Props) {
    const classes = [base, variant === 'note' ? `${base}--note` : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <article className={classes} style={style} data-app={dataApp} {...rest}>
            {children}
        </article>
    );
}
