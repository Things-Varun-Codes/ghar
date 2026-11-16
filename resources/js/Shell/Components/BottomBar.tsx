import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { BookHeart, House, LayoutGrid, Mailbox, Sofa } from 'lucide-react';
import { dashboard } from '@/routes';
import { activeMiniApp, roomsForBar } from '@/Shell/Components/bottom-bar';
import type { MiniApp } from '@/types/miniapp';

/*
 * Names a registry entry may use for its `icon`. An unknown name falls back to a neutral tile,
 * so an app added without an entry here still gets a door in the bar.
 */
const ROOM_ICONS: Record<string, LucideIcon> = {
    BookHeart,
    Mailbox,
    Sofa,
};

type SharedProps = { miniApps?: MiniApp[] };

/** The phone and tablet room switcher: Home first, then each enabled room from the registry. */
export default function BottomBar() {
    const { props, component, url } = usePage<SharedProps>();
    const rooms = roomsForBar(props.miniApps ?? []);
    const path = url.split('?')[0].replace(/\/$/, '') || '/';
    const active = activeMiniApp(rooms, component, path);
    const onHome = component === 'Shell/Pages/Dashboard';

    return (
        <nav aria-label="Rooms" className="shell-bottombar lg:hidden">
            <ul className="shell-bottombar-list">
                <BarItem
                    href={dashboard.url()}
                    label="Home"
                    Icon={House}
                    current={onHome ? 'page' : undefined}
                />
                {rooms.map((app) => (
                    <BarItem
                        key={app.slug}
                        href={app.route}
                        label={app.nav_label ?? app.name.replace(/^Our\s+/, '')}
                        Icon={(app.icon && ROOM_ICONS[app.icon]) || LayoutGrid}
                        current={
                            active?.slug === app.slug
                                ? path === app.route
                                    ? 'page'
                                    : 'true'
                                : undefined
                        }
                    />
                ))}
            </ul>
        </nav>
    );
}

function BarItem({
    href,
    label,
    Icon,
    current,
}: {
    href: string;
    label: string;
    Icon: LucideIcon;
    current?: 'page' | 'true';
}) {
    return (
        <li className="flex min-w-0 flex-1">
            <Link
                href={href}
                aria-current={current}
                className="shell-focus shell-bottombar-item"
            >
                <span className="shell-bottombar-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.5} />
                </span>
                <span className="shell-bottombar-label">{label}</span>
            </Link>
        </li>
    );
}
