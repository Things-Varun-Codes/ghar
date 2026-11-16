export type MiniAppPreview = {
    images?: string[];
    note?: string;
    note_from?: string;
};

export type MiniApp = {
    name: string;
    slug: string;
    route: string;
    description: string;
    component_prefix?: string;
    /** A lucide icon name for the phone bottom bar. */
    icon?: string;
    /** The short bottom-bar label; defaults to the name without "Our". */
    nav_label?: string;
};
