import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import type { ShellNavItem } from '@/Shell/Components/shell-nav';

/** The Settings and Admin pages: one card of rows, each opening its own page. */
export default function NavList({ items }: { items: ShellNavItem[] }) {
    return (
        <ul className="os-settings-card divide-y divide-(--border) overflow-hidden">
            {items.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                    <Link
                        href={href}
                        className="shell-focus os-settings-hub-row flex items-center gap-4"
                    >
                        <Icon
                            size={20}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className="shrink-0 text-(--muted-foreground)"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="os-settings-row-label block">
                                {label}
                            </span>
                            <span className="os-settings-row-status block">
                                {hint}
                            </span>
                        </span>
                        <ChevronRight
                            size={18}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            className="shrink-0 text-(--muted-foreground)"
                        />
                    </Link>
                </li>
            ))}
        </ul>
    );
}
