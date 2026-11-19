import { Fade } from '@/components/motion';
import { count } from '@/lib/plural';

type Props = {
    length: number;
    max: number;
};

/* A field's maxLength stops typing at the limit; this says so before it happens. */
export default function CharCount({ length, max }: Props) {
    // Stays out of the way until the writer is near the limit.
    const shown = length >= Math.floor(max * 0.8);
    const left = Math.max(0, max - length);
    const tone = left === 0 ? 'limit' : left <= 20 ? 'warn' : undefined;
    const text =
        left === 0 ? 'No characters left' : `${count(left, 'character')} left`;

    return (
        <>
            <Fade show={shown}>
                <p
                    aria-hidden="true"
                    className="mailbox-char-count"
                    data-tone={tone}
                >
                    {text}
                </p>
            </Fade>
            {/* Announced only near the end, so typing isn't read out key by key. */}
            <span role="status" aria-live="polite" className="sr-only">
                {shown && left <= 20 ? text : ''}
            </span>
        </>
    );
}
