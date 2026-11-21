import { displayLocation } from '@/MiniApps/History/lib/moment';

/* A located moment as the Map page gets it: just enough for a marker and a menu row. */
export type MapPoint = {
    id: number;
    date_label: string;
    title: string | null;
    location_name: string | null;
    location_address: string | null;
    location_freetext: string | null;
    lat: number;
    lng: number;
};

export type Place = {
    key: string;
    label: string;
    lat: number;
    lng: number;
    /* Newest first, as the server sends them. */
    moments: MapPoint[];
};

/*
 * Moments at the same spot as one place: a family has many at home or at grandma's, and those
 * never split apart however far the map zooms in. Same spot is the same coordinates to about a
 * metre (5 decimals), so two picks of one place still meet.
 */
export function groupPlaces(points: MapPoint[]): Place[] {
    const places = new Map<string, Place>();

    for (const point of points) {
        const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
        const place = places.get(key);

        if (place) {
            place.moments.push(point);
        } else {
            places.set(key, {
                key,
                label: displayLocation(point) ?? 'A place',
                lat: point.lat,
                lng: point.lng,
                moments: [point],
            });
        }
    }

    return [...places.values()];
}

export function momentLabel(point: MapPoint): string {
    return point.title ?? point.date_label;
}
