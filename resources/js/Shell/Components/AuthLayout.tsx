import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import HeartMark from '@/Shell/Components/HeartMark';
import GuestLayout from '@/Shell/Layouts/GuestLayout';

interface Props {
    title: string;
    subtitle?: ReactNode;
    tagline?: string;
    children: ReactNode;
}

const DEFAULT_TAGLINE = 'Shoes off, come on in.';

export default function AuthLayout({
    title,
    subtitle,
    tagline = DEFAULT_TAGLINE,
    children,
}: Props) {
    const appName = usePage().props.name;

    return (
        <GuestLayout>
            <div className="grid w-full max-w-[920px] grid-cols-1 items-center gap-12 md:grid-cols-[1.1fr_1fr] md:gap-14">
                <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="shell-wordmark-auth leading-none">
                        {appName}
                        <HeartMark size={30} filled />
                    </div>
                    <p className="mt-4 max-w-xs text-[18px] leading-relaxed text-(--muted-foreground)">
                        {tagline}
                    </p>
                </div>

                <div className="w-full max-w-sm rounded-[24px] border border-(--border) bg-(--card) p-8">
                    <h1 className="shell-auth-title leading-tight">{title}</h1>
                    {subtitle && (
                        <p className="mt-1 text-[14px] text-(--muted-foreground)">
                            {subtitle}
                        </p>
                    )}
                    {children}
                </div>
            </div>
        </GuestLayout>
    );
}
