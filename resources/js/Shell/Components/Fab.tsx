import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
    onClick: () => void;
    ariaLabel: string;
    icon: ReactNode;
};

/* The add button; its name is said by the label, and shown in a tooltip to a pointer. */
export default function Fab({ onClick, ariaLabel, icon }: Props) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        type="button"
                        size="icon"
                        onClick={onClick}
                        aria-label={ariaLabel}
                        className="shell-fab"
                    />
                }
            >
                {icon}
            </TooltipTrigger>
            <TooltipContent side="left">{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}
