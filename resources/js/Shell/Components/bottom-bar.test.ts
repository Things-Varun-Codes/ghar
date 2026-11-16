import { describe, expect, it } from 'vitest';
import { roomsForBar } from '@/Shell/Components/bottom-bar';
import type { MiniApp } from '@/types/miniapp';

function app(slug: string, prefix?: string): MiniApp {
    return {
        name: slug,
        slug,
        route: `/apps/${slug}`,
        description: '',
        component_prefix: prefix,
    };
}

describe('roomsForBar', () => {
    it('keeps Home plus four rooms at most', () => {
        const apps = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => app(s));

        expect(roomsForBar(apps).map((a) => a.slug)).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
    });
});
