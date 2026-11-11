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
};
