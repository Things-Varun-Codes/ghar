/** 'smooth', unless the person has asked for less motion. Use for every scrollIntoView/scrollTo. */
export function scrollBehavior(): ScrollBehavior {
    return typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
}
