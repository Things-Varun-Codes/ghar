import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { House, LayoutGrid } from 'lucide-react';
import { dashboard } from '@/routes';
import { navIconFor, roomsForBar } from '@/Shell/Components/bottom-bar';
import type { MiniApp } from '@/types/miniapp';

/*
 * Each room supplies its bar icon as the default export of MiniApps/{App}/nav-icon.tsx. A build-time
 * glob keeps the shell free of named imports, so a new room needs no shell edit. Eager: each module
 * is a single lucide icon, so the first paint has no flash and no extra request.
 */
const navIcons = import.meta.glob<LucideIcon>('../../MiniApps/*/nav-icon.tsx', {
    eager: true,
    import: 'default',
});

type SharedProps = { miniApps?: MiniApp[] };

/** The phone and tablet room switcher: Home first, then each enabled room from the registry. */
export default function BottomBar({
    path,
    activeRoom,
}: {
    path: string;
    activeRoom: MiniApp | undefined;
}) {
    const { props, component } = usePage<SharedProps>();
    const rooms = roomsForBar(props.miniApps ?? []);
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
                        Icon={navIconFor(app, navIcons) ?? LayoutGrid}
                        current={
                            activeRoom?.slug === app.slug
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
