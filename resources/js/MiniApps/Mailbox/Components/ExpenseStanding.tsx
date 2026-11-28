import { formatMoney } from '@/MiniApps/Mailbox/lib/money';

type Props = {
    /* Minor units: positive when the viewer is owed. */
    net: number;
    /* What to say when it is nothing either way. */
    even: string;
};

/* Where the viewer stands, as a sentence: the words always come with the coloured figure. */
export default function ExpenseStanding({ net, even }: Props) {
    if (net === 0) {
        return even;
    }

    return (
        <>
            {net > 0 ? 'You are owed' : 'You owe'}{' '}
            <strong
                className="mailbox-expense-amount"
                data-direction={net > 0 ? 'in' : 'out'}
            >
                {formatMoney(Math.abs(net))}
            </strong>
        </>
    );
}
