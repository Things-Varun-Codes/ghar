import { useMediaQuery } from 'usehooks-ts';

// The two thresholds the stylesheets name with `@variant md` and `@variant lg`.
export const PHONE_QUERY = '(max-width: 767.98px)';
export const SIDEBAR_QUERY = '(min-width: 1024px)';

/** Below md: the phone layout. */
export function useIsPhone(): boolean {
    return useMediaQuery(PHONE_QUERY);
}

/** From lg: the sidebar is shown and the phone top and bottom bars are not. */
export function useHasSidebar(): boolean {
    return useMediaQuery(SIDEBAR_QUERY);
}

/*
 * Where a sheet comes from: the bottom on a narrow screen, the right on a wide one. `panelFrom`
 * is the breakpoint where it turns into a side panel.
 */
export function useSheetSide(
    panelFrom: 'md' | 'lg' = 'md',
): 'right' | 'bottom' {
    const isPhone = useIsPhone();
    const hasSidebar = useHasSidebar();
    const wide = panelFrom === 'lg' ? hasSidebar : !isPhone;

    return wide ? 'right' : 'bottom';
}
