/*
 * "Open in Maps" opens the device's own maps app. A saved map link is opened as it is. Without
 * one, the place goes by its coordinates or its name, in the form each platform's maps app
 * answers to. Like the server's map-link reading (MapLink.php), this is the one place in the
 * frontend that has to know how map addresses are written, so the forms are kept in this table:
 *
 * - Apple devices: the system maps address, which opens the Maps app.
 * - Android: a geo: address, which offers whichever maps apps are installed.
 * - Anything else: a web map that needs no account or key.
 */

export type Place = {
    location_label: string | null;
    location_url: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    title: string;
};

export type Platform = 'apple' | 'android' | 'other';

export function platformOf(userAgent: string): Platform {
    if (/iPhone|iPad|iPod|Macintosh/i.test(userAgent)) {
        return 'apple';
    }

    if (/Android/i.test(userAgent)) {
        return 'android';
    }

    return 'other';
}

export function hasPlace(place: Place): boolean {
    return Boolean(
        place.location_url ||
        place.location_label ||
        place.address ||
        (place.lat !== null && place.lng !== null),
    );
}

/* What a person reads for the place: its name, else its address, else its coordinates. */
export function placeLabel(place: Place): string {
    if (place.location_label) {
        return place.location_label;
    }

    if (place.address) {
        return place.address;
    }

    if (place.lat !== null && place.lng !== null) {
        return `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;
    }

    return 'On the map';
}

export function mapsHref(place: Place, platform: Platform): string | null {
    if (place.location_url) {
        return place.location_url;
    }

    const name = place.location_label || place.title;
    const point =
        place.lat !== null && place.lng !== null
            ? `${place.lat},${place.lng}`
            : null;
    const query = [place.location_label, place.address]
        .filter(Boolean)
        .join(', ');

    if (point === null && query === '') {
        return null;
    }

    switch (platform) {
        case 'apple': {
            const params = new URLSearchParams(
                point ? { ll: point, q: name } : { q: query },
            );

            return `https://maps.apple.com/?${params.toString()}`;
        }
        case 'android':
            return point
                ? `geo:${point}?q=${point}(${encodeURIComponent(name)})`
                : `geo:0,0?q=${encodeURIComponent(query)}`;
        case 'other':
            return point
                ? `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`
                : `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
    }
}
