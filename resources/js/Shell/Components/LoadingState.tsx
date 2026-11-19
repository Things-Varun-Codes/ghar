import { Skeleton } from '@/components/ui/skeleton';

type Props = {
    rows?: number;
    variant?: 'card' | 'list' | 'form';
};

const ROW: Record<Exclude<Props['variant'], undefined | 'form'>, string> = {
    card: 'h-20',
    list: 'h-6',
};

export default function LoadingState({ rows = 3, variant = 'list' }: Props) {
    return (
        <div
            aria-busy="true"
            aria-label="Loading"
            role="status"
            className="w-full"
        >
            {Array.from({ length: rows }).map((_, i) =>
                variant === 'form' ? (
                    <div key={i} className="mb-4">
                        <Skeleton className="mb-1.5 h-4 w-[30%] rounded-[6px]" />
                        <Skeleton className="h-11 w-full rounded-[6px]" />
                    </div>
                ) : (
                    <Skeleton
                        key={i}
                        className={`mb-3 w-full rounded-[6px] ${ROW[variant]}`}
                    />
                ),
            )}
        </div>
    );
}
