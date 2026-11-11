import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string;
};

export default function BouquetDialog({ open, onOpenChange, imageUrl }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-app="our-mailbox"
                className="mailbox-bouquet-lightbox"
            >
                <DialogTitle className="sr-only">Bouquet image</DialogTitle>
                <img
                    src={imageUrl}
                    alt="Your flower bouquet"
                    className="mailbox-lightbox-image"
                />
            </DialogContent>
        </Dialog>
    );
}
