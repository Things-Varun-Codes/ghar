import { describe, expect, it } from 'vitest';
import type { IconPaths } from './lucide';
import { iconNode } from './lucide';

const data = {
    version: 'test',
    paths: {
        star: [
            ['path', { d: 'M1 1' }],
            ['circle', { cx: '2' }],
        ],
    },
    aliases: { favourite: 'star' },
} as unknown as IconPaths;

describe('iconNode', () => {
    it('gives every part of a drawing a key, so React can tell them apart', () => {
        expect(iconNode(data, 'star')).toEqual([
            ['path', { d: 'M1 1', key: '0' }],
            ['circle', { cx: '2', key: '1' }],
        ]);
    });

    it('follows an alias to the same keyed drawing', () => {
        expect(iconNode(data, 'favourite')).toBe(iconNode(data, 'star'));
    });

    it('returns null for an unknown name', () => {
        expect(iconNode(data, 'nope')).toBeNull();
    });
});
