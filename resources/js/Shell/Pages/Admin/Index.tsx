import NavList from '@/Shell/Components/NavList';
import Page from '@/Shell/Components/Page';
import { ADMIN_ITEMS } from '@/Shell/Components/shell-nav';

export default function AdminIndex() {
    return (
        <Page
            tier="prose"
            title="Admin settings"
            documentTitle="Admin settings"
            backChevron
        >
            <NavList items={ADMIN_ITEMS} />
        </Page>
    );
}
