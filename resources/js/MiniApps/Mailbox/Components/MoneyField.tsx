import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    currencySymbol,
    formatMoney,
    fractionDigits,
} from '@/MiniApps/Mailbox/lib/money';

type Props = {
    id: string;
    label: string;
    /* As typed. */
    value: string;
    onChange: (value: string) => void;
    /* The typed text in minor units, or null while it can't be read. */
    amount: number | null;
    error?: string;
};

/* The amount as the largest thing on the form, the way a bill prints its total. */
export default function MoneyField({
    id,
    label,
    value,
    onChange,
    amount,
    error,
}: Props) {
    const errorId = `${id}-error`;
    // Read back only once there are separators to add: 240000 is easier to check as 2,40,000.00.
    const echo =
        amount !== null && amount >= 1000 * 10 ** fractionDigits()
            ? formatMoney(amount)
            : null;
    const echoId = `${id}-echo`;

    return (
        <div className="mailbox-form-field mailbox-money-field">
            <label htmlFor={id}>
                {label}
                <span aria-hidden="true">*</span>
            </label>
            <div className="mailbox-money-box">
                <span aria-hidden="true" className="mailbox-money-symbol">
                    {currencySymbol()}
                </span>
                <Input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-required="true"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        [error ? errorId : null, echo ? echoId : null]
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    placeholder="0"
                    className="mailbox-money-input"
                />
            </div>
            {error && (
                <FieldError id={errorId} className="mailbox-field-error">
                    {error}
                </FieldError>
            )}
            {echo && (
                <p id={echoId} className="mailbox-field-helper">
                    {echo}
                </p>
            )}
        </div>
    );
}
