type Props = {
    rows?: number;
    variant?: 'card' | 'list' | 'form';
};

const HEIGHTS: Record<
    NonNullable<Props['variant']>,
    number | { label: number; input: number }
> = {
    card: 80,
    list: 24,
    form: { label: 16, input: 44 },
};

export default function LoadingState({ rows = 3, variant = 'list' }: Props) {
    const height = HEIGHTS[variant];

    return (
        <div
            aria-busy="true"
            aria-label="Loading"
            role="status"
            className="w-full"
        >
            {Array.from({ length: rows }).map((_, i) => {
                if (variant === 'form' && typeof height === 'object') {
                    return (
                        <div key={i} className="mb-4">
                            <div
                                className="shell-skeleton mb-1.5 w-[30%] rounded-[6px]"
                                style={{ height: height.label }}
                            />
                            <div
                                className="shell-skeleton w-full rounded-[6px]"
                                style={{ height: height.input }}
                            />
                        </div>
                    );
                }

                return (
                    <div
                        key={i}
                        className="shell-skeleton mb-3 w-full rounded-[6px]"
                        style={{
                            height: typeof height === 'number' ? height : 24,
                        }}
                    />
                );
            })}
        </div>
    );
}
