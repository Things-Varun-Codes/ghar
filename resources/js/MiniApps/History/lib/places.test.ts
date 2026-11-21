import { describe, expect, it } from 'vitest';
import { groupPlaces } from './places';
import type { MapPoint } from './places';

function point(id: number, lat: number, lng: number, name: string): MapPoint {
    return {
        id,
        date_label: '4 Jun 2024',
        title: `Moment ${id}`,
        location_name: name,
        location_address: null,
        location_freetext: null,
        lat,
        lng,
    };
}

describe('groupPlaces', () => {
    it('puts moments at the same spot in one place, in the order given', () => {
        const places = groupPlaces([
            point(3, 12.983, 77.619, 'Ulsoor Lake'),
            point(2, 15.335, 76.46, 'Hampi'),
            point(1, 12.9830000004, 77.619, 'Ulsoor Lake'),
        ]);

        expect(
            places.map((p) => [p.label, p.moments.map((m) => m.id)]),
        ).toEqual([
            ['Ulsoor Lake', [3, 1]],
            ['Hampi', [2]],
        ]);
    });

    it('keeps places a street apart separate', () => {
        expect(
            groupPlaces([
                point(1, 12.983, 77.619, 'Lake'),
                point(2, 12.984, 77.619, 'Cafe'),
            ]),
        ).toHaveLength(2);
    });
});
