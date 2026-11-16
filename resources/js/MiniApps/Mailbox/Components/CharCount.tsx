type Props = {
    length: number;
    max: number;
    /* Stays out of the way until the writer is near the limit. */
    showFrom?: number;
};

/* A field's maxLength stops typing at the limit; this says so before it happens. */
export default function CharCount({
    length,
    max,
    showFrom = Math.floor(max * 0.8),
}: Props) {
    if (length < showFrom) {
        return null;
    }

    const left = Math.max(0, max - length);
    const tone = left === 0 ? 'limit' : left <= 20 ? 'warn' : undefined;
    const text =
        left === 0
            ? 'No characters left'
            : `${left} character${left === 1 ? '' : 's'} left`;

    return (
        <>
            <p
                aria-hidden="true"
                className="mailbox-char-count"
                data-tone={tone}
            >
                {text}
            </p>
            {/* Announced only near the end, so typing isn't read out key by key. */}
            <span role="status" aria-live="polite" className="sr-only">
                {left <= 20 ? text : ''}
            </span>
        </>
    );
}
