import { SearchX } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
    /**
     * The active search. When non-empty the state reads as "no matches": a search icon and,
     * unless `action` is given, a "Clear search" button that calls `onClearSearch`.
     */
    query?: string | null;
    onClearSearch?: () => void;
};

export function noMatchesTitle(noun: string, query: string): string {
    return `No ${noun} match “${query}”`;
}

export default function EmptyState({
    icon,
    title,
    body,
    action,
    query,
    onClearSearch,
}: Props) {
    const searching = Boolean(query && query.trim() !== '');
    const Icon = icon ?? (searching ? SearchX : HeartMark);
    const resolvedAction =
        action ??
        (searching && onClearSearch ? (
            <Button
                type="button"
                variant="outline"
                className="shell-press"
                onClick={onClearSearch}
            >
                Clear search
            </Button>
        ) : null);

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
            {resolvedAction && <div className="mt-4">{resolvedAction}</div>}
        </div>
    );
}
