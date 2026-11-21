export type Paginated<T> = {
    data: T[];
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    next_page_url: string | null;
    prev_page_url: string | null;
    // Populated by any surface whose controller resolves its list through
    // the shared CursorList helper — Our Shelf and all four Our Exchange
    // surfaces (Messages, Flowers, Citations, Coupons). Mailbox declares no status column, so its
    // figures arrive
    // degraded: `active` equals `all` and `done` is always 0. Optional
    // because the History timeline sends a bare cursor payload without it.
    counts?: { all: number; active: number; done: number };
};
