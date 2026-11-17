import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useOverlayHistory } from '@/hooks/use-overlay-history';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string;
};

export default function BouquetDialog({ open, onOpenChange, imageUrl }: Props) {
    useOverlayHistory(open, () => onOpenChange(false));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mailbox-bouquet-lightbox">
                <DialogTitle className="sr-only">Bouquet image</DialogTitle>
                <img
                    src={imageUrl}
                    alt="Flower bouquet"
                    className="mailbox-lightbox-image"
                />
            </DialogContent>
        </Dialog>
    );
}
