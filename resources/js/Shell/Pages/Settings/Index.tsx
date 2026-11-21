import NavList from '@/Shell/Components/NavList';
import Page from '@/Shell/Components/Page';
import { SETTINGS_ITEMS } from '@/Shell/Components/shell-nav';

export default function SettingsIndex() {
    return (
        <Page
            tier="prose"
            title="Settings"
            documentTitle="Settings"
            backChevron
        >
            <NavList items={SETTINGS_ITEMS} />
        </Page>
    );
}
