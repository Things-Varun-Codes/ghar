import { Head, router, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import adminRoutes from '@/routes/admin';
import Page from '@/Shell/Components/Page';
import { Spinner } from '@/Shell/Components/Spinner';
import AppLayout from '@/Shell/Layouts/AppLayout';

type Theme = {
    name: string;
    slug: string;
    swatches: [string, string, string];
};

type SharedProps = {
    activeTheme: string;
    themes: Theme[];
};

/* Swatches arrive from PHP config and render as raw CSS values, so validate them at runtime. */
const SAFE_CSS_COLOR =
    /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:oklch|oklab|rgb|rgba|hsl|hsla|color)\([^)]+\)|[a-z]+)$/i;

const SWATCH_FALLBACK = '#ccc';

function safeSwatch(raw: unknown): string {
    if (typeof raw !== 'string') {
        return SWATCH_FALLBACK;
    }

    const trimmed = raw.trim();

    if (trimmed === '' || trimmed.length > 64) {
        return SWATCH_FALLBACK;
    }

    return SAFE_CSS_COLOR.test(trimmed) ? trimmed : SWATCH_FALLBACK;
}

function safeSwatches(input: unknown): [string, string, string] {
    const arr = Array.isArray(input) ? input : [];

    return [safeSwatch(arr[0]), safeSwatch(arr[1]), safeSwatch(arr[2])];
}

export default function ThemeIndex() {
    const { props } = usePage<SharedProps>();
    const activeTheme = props.activeTheme ?? 'pastel';
    const themes = props.themes ?? [];

    // In-flight state — only one submission at a time.
    // submittingSlug (state) drives the UI; submittingRef (ref) is the
    // synchronous guard against rapid double-clicks. useState alone is not
    // enough — the check `submittingSlug !== null` reads stale state because
    // setSubmittingSlug is async, so two fast clicks can both pass the guard
    // and issue duplicate router.post() calls (last-write-wins on settings).
    const [submittingSlug, setSubmittingSlug] = useState<string | null>(null);
    const submittingRef = useRef(false);

    const handleApply = (slug: string) => {
        if (submittingRef.current) {
            return;
        }

        submittingRef.current = true;
        setSubmittingSlug(slug);
        const action = adminRoutes.theme.update();
        router.post(
            action.url,
            { theme: slug },
            {
                onFinish: () => {
                    submittingRef.current = false;
                    setSubmittingSlug(null);
                },
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Theme — Admin" />

            <Page
                tier="index"
                title="Theme"
                backChevron
                subtitle="Pick how the app looks. Everyone sees the change on their next page load."
            >
                <div className="flex flex-row flex-wrap gap-4">
                    {themes.map((theme) => {
                        const isActive = theme.slug === activeTheme;
                        const isSubmitting = submittingSlug === theme.slug;
                        const swatches = safeSwatches(theme.swatches);
                        const [dominant, pill, accentText] = swatches;

                        return (
                            <div
                                key={theme.slug}
                                role="group"
                                aria-label={`${theme.name} theme`}
                                className="os-admin-theme-card"
                            >
                                <span className="os-admin-section-title">
                                    {theme.name}
                                </span>

                                <div
                                    aria-hidden="true"
                                    className="os-admin-theme-preview"
                                    style={{ backgroundColor: dominant }}
                                >
                                    <span
                                        className="os-admin-theme-wordmark"
                                        style={{ color: accentText }}
                                    >
                                        {props.name}
                                    </span>
                                    <div className="os-admin-theme-preview-row">
                                        <span
                                            className="os-admin-theme-pill"
                                            style={{ backgroundColor: pill }}
                                        />
                                        <span
                                            className="os-admin-theme-cta"
                                            style={{
                                                backgroundColor: accentText,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {isActive ? (
                                        <span
                                            aria-label="Active theme, currently in use"
                                            className="os-admin-theme-active"
                                        >
                                            <Check
                                                size={14}
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                            In use
                                        </span>
                                    ) : (
                                        <Button
                                            onClick={() =>
                                                handleApply(theme.slug)
                                            }
                                            disabled={submittingSlug !== null}
                                            aria-busy={isSubmitting}
                                            className="min-h-[44px]"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Spinner />
                                                    Applying theme…
                                                </>
                                            ) : (
                                                'Apply theme'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Page>
        </AppLayout>
    );
}
