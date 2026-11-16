import LinkItemDialog from '@/MiniApps/Corner/Components/LinkItemDialog';
import PlaceItemDialog from '@/MiniApps/Corner/Components/PlaceItemDialog';
import PlainItemDialog from '@/MiniApps/Corner/Components/PlainItemDialog';
import PosterItemDialog from '@/MiniApps/Corner/Components/PosterItemDialog';
import type { CornerItem, CornerListInfo } from '@/MiniApps/Corner/lib/types';

export type ItemDialogProps = {
    list: CornerListInfo;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /* Set when editing. */
    item?: CornerItem;
};

/* Adding to, or editing in, a list: the fields follow the list's kind. */
export default function ItemDialog(props: ItemDialogProps) {
    switch (props.list.kind) {
        case 'link':
            return <LinkItemDialog {...props} />;
        case 'poster':
            return <PosterItemDialog {...props} />;
        case 'place':
            return <PlaceItemDialog {...props} />;
        case 'plain':
            return <PlainItemDialog {...props} />;
    }
}
