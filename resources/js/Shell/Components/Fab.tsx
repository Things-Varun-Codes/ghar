import type { ReactNode } from 'react';

type Props = {
    onClick: () => void;
    ariaLabel: string;
    icon: ReactNode;
};

export default function Fab({ onClick, ariaLabel, icon }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            title={ariaLabel}
            className="shell-fab"
        >
            {icon}
        </button>
    );
}
