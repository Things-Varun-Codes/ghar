import type { ComponentType, ReactNode } from 'react';
import HeartMark from '@/Shell/Components/HeartMark';

type IconComponent = ComponentType<{
    size?: number;
    strokeWidth?: number;
    'aria-hidden'?: 'true';
    className?: string;
}>;

type Props = {
    icon?: IconComponent;
    title: string;
    body?: string;
    action?: ReactNode;
};

export default function EmptyState({
    icon: Icon = HeartMark,
    title,
    body,
    action,
}: Props) {
    return (
        <div className="mx-auto mt-16 mb-0 flex max-w-[360px] flex-col items-center text-center">
            <Icon
                size={40}
                strokeWidth={1.5}
                className="text-(--shell-accent-text)"
                aria-hidden="true"
            />
            <h2 className="shell-empty-title mt-4 leading-tight">{title}</h2>
            {body && (
                <p className="mt-2 text-[16px] leading-[1.5] text-(--shell-text-muted)">
                    {body}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
