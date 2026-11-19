import type { EventReactionSummary, HistoryEvent, ReactionKey } from './types';

const GLYPHS: Record<ReactionKey, string> = {
    heart: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    pray: '🙏',
    party: '🎉',
};

/* All six, as the server sends them; `overrides` fills in the ones used. */
export function reactions(
    overrides: Partial<Record<ReactionKey, Partial<EventReactionSummary>>> = {},
): EventReactionSummary[] {
    return (Object.keys(GLYPHS) as ReactionKey[]).map((key) => ({
        key,
        emoji: GLYPHS[key],
        count: 0,
        mine: false,
        people: [],
        ...overrides[key],
    }));
}

/* A moment as EventResource sends it, for tests. */
export function testMoment(
    overrides: Partial<HistoryEvent> = {},
): HistoryEvent {
    return {
        id: 5,
        date: '2024-06-04',
        date_label: '4 Jun 2024',
        year: 2024,
        title: 'Monsoon drive to the coast',
        location_freetext: null,
        location_place_id: null,
        location_name: null,
        location_address: null,
        location_lat: null,
        location_lng: null,
        body_html: '<p>Rain all the way.</p>',
        links: {},
        created_at: '2024-06-05T10:00:00Z',
        updated_at: '2024-06-05T10:00:00Z',
        media: [],
        changes: [],
        creator: { id: 2, name: 'Ravi', avatar_url: null },
        birthday_of: null,
        reactions: reactions(),
        comments: [],
        can: { update: true, delete: true },
        ...overrides,
    };
}
