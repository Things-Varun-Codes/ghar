export type MiniApp = {
    name: string;
    slug: string;
    route: string;
    description: string;
    component_prefix?: string;
    /** The short bottom-bar label; defaults to the name without "Our". */
    nav_label?: string;
};
