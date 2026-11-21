import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';

type Props = {
    noun: 'note' | 'bouquet';
    label: string;
    triggerClassName: string;
    onDelete: () => void;
};

export default function MailDeleteMenu({
    noun,
    label,
    triggerClassName,
    onDelete,
}: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    aria-label={label}
                    render={
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`${triggerClassName} shell-hit-44`}
                        />
                    }
                >
                    <MoreHorizontal
                        size={18}
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirmOpen(true)}
                    >
                        Delete {noun}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`Delete this ${noun}?`}
                description="This can't be undone."
                cancelLabel="Keep it"
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => {
                    setConfirmOpen(false);
                    onDelete();
                }}
            />
        </>
    );
}
