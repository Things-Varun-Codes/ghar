export default function HeartMark({
    size = 16,
    filled = false,
    className,
    style,
}: {
    size?: number;
    filled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={filled ? 1.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
            style={style}
        >
            <path d="M12.2 20.3C8.6 17.6 3.3 13.9 3 9.1 2.8 6 5 3.9 7.6 4c2 .1 3.5 1.3 4.5 3.2C13 5.2 14.7 3.8 16.8 3.9c2.6.1 4.4 2.3 4.2 5.1-.3 4.7-5.2 8.5-8.8 11.3Z" />
        </svg>
    );
}
