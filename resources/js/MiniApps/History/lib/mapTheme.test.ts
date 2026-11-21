import { describe, expect, it } from 'vitest';
import { themePaint } from './mapTheme';

const tokenOf = (id: string, type: string, property: string) =>
    themePaint([{ id, type }]).find((p) => p.property === property)?.token;

describe('themePaint', () => {
    it('gives each kind of basemap layer its token', () => {
        expect(tokenOf('background', 'background', 'background-color')).toBe(
            '--history-map-land',
        );
        expect(tokenOf('water', 'fill', 'fill-color')).toBe(
            '--history-map-water',
        );
        expect(tokenOf('landcover_wood', 'fill', 'fill-color')).toBe(
            '--history-map-park',
        );
        expect(tokenOf('building', 'fill', 'fill-outline-color')).toBe(
            '--history-map-edge',
        );
        expect(tokenOf('highway_major_inner', 'line', 'line-color')).toBe(
            '--history-map-road',
        );
        expect(tokenOf('highway_major_casing', 'line', 'line-color')).toBe(
            '--history-map-edge',
        );
        expect(tokenOf('aeroway-runway-casing', 'line', 'line-color')).toBe(
            '--history-map-edge',
        );
        expect(tokenOf('label_city', 'symbol', 'text-color')).toBe(
            '--history-map-place',
        );
        expect(tokenOf('water_name_point_label', 'symbol', 'text-color')).toBe(
            '--history-map-water-ink',
        );
        expect(tokenOf('highway-name-major', 'symbol', 'text-color')).toBe(
            '--history-map-label',
        );
    });

    it('leaves road shields alone', () => {
        expect(themePaint([{ id: 'road_shield_us', type: 'symbol' }])).toEqual(
            [],
        );
    });
});
