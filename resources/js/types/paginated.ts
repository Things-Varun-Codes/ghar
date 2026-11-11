export type Paginated<T> = {
    data: T[];
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    next_page_url: string | null;
    prev_page_url: string | null;
    // Populated by any surface whose controller resolves its list through
    // the shared CursorList helper — Our Corner and all four Our Mailbox
    // surfaces (Messages, Flowers, Challans, Coupons). Mailbox declares no status column, so its
    // figures arrive
    // degraded: `active` equals `all` and `done` is always 0. Stays optional
    // because a controller may still emit a bare cursor payload with no
    // such key at all — the History events index is the surviving example.
    counts?: { all: number; active: number; done: number };
};
