import type { ReactNode } from 'react';
import { useId } from 'react';
import { Field, FieldContent, FieldDescription } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type Props = {
    label: ReactNode;
    /* The line under the label: what turning it on does. */
    description?: ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    /* For a form post or a test hook. */
    name?: string;
    id?: string;
    className?: string;
    labelClassName?: string;
    descriptionClassName?: string;
};

/*
 * A setting that is on or off: its label and description on the left, the switch on the right.
 * The label names the switch and the description describes it, so the whole row is one control
 * to assistive tech.
 */
export default function SwitchRow({
    label,
    description,
    checked,
    onCheckedChange,
    disabled,
    name,
    id,
    className,
    labelClassName,
    descriptionClassName,
}: Props) {
    const generated = useId();
    const switchId = id ?? generated;
    const descriptionId = `${switchId}-description`;

    return (
        <Field
            orientation="horizontal"
            className={cn('justify-between', className)}
            data-disabled={disabled || undefined}
        >
            <FieldContent>
                <Label htmlFor={switchId} className={labelClassName}>
                    {label}
                </Label>
                {description && (
                    <FieldDescription
                        id={descriptionId}
                        className={descriptionClassName}
                    >
                        {description}
                    </FieldDescription>
                )}
            </FieldContent>
            <Switch
                id={switchId}
                name={name}
                checked={checked}
                onCheckedChange={(next) => onCheckedChange(next)}
                disabled={disabled}
                aria-describedby={description ? descriptionId : undefined}
            />
        </Field>
    );
}
