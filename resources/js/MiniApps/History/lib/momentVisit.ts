/*
 * A reaction or comment answers back() to the page, `?moment=` and all. Asking for only the
 * moment keeps the sheet open and the page as it is, and leaves the loaded rows alone: patch
 * their counts with useFreshMoments.
 */
export const MOMENT_ONLY = {
    only: ['moment'],
    preserveState: true,
    preserveScroll: true,
};
