import { describe, expect, it } from 'vitest';

import { hasPlace, mapsHref, placeLabel, platformOf } from './maps';
import type { Place } from './maps';

const none: Place = {
    title: 'Blue Door Cafe',
    location_label: null,
    location_url: null,
    lat: null,
    lng: null,
    address: null,
};

describe('Open in Maps', () => {
    it('opens a saved map link as it is, on every platform', () => {
        const place = {
            ...none,
            location_url: 'https://maps.example/short/abc',
            lat: 1,
            lng: 2,
        };

        for (const platform of ['apple', 'android', 'other'] as const) {
            expect(mapsHref(place, platform)).toBe(
                'https://maps.example/short/abc',
            );
        }
    });

    it('describes coordinates in the form each platform answers to', () => {
        const place = {
            ...none,
            location_label: 'Blue Door Cafe',
            lat: 9.9658,
            lng: 76.2421,
        };

        expect(mapsHref(place, 'apple')).toBe(
            'https://maps.apple.com/?ll=9.9658%2C76.2421&q=Blue+Door+Cafe',
        );
        expect(mapsHref(place, 'android')).toBe(
            'geo:9.9658,76.2421?q=9.9658,76.2421(Blue%20Door%20Cafe)',
        );
        expect(mapsHref(place, 'other')).toContain('mlat=9.9658&mlon=76.2421');
    });

    it('searches for a typed place by its name and address', () => {
        const place = {
            ...none,
            location_label: 'The Dosa Window',
            address: 'MG Road',
        };

        expect(mapsHref(place, 'android')).toBe(
            'geo:0,0?q=The%20Dosa%20Window%2C%20MG%20Road',
        );
        expect(mapsHref(place, 'apple')).toContain(
            'q=The+Dosa+Window%2C+MG+Road',
        );
    });

    it('has nothing to open without a place', () => {
        expect(hasPlace(none)).toBe(false);
        expect(mapsHref(none, 'other')).toBeNull();
    });

    it('labels a place by name, then address, then coordinates', () => {
        expect(placeLabel({ ...none, address: '12 Fort Road' })).toBe(
            '12 Fort Road',
        );
        expect(placeLabel({ ...none, lat: 1.5, lng: 2.25 })).toBe(
            '1.50000, 2.25000',
        );
        expect(placeLabel({ ...none, location_url: 'https://x.test' })).toBe(
            'On the map',
        );
    });

    it('tells the platforms apart', () => {
        expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe(
            'apple',
        );
        expect(platformOf('Mozilla/5.0 (Linux; Android 15)')).toBe('android');
        expect(platformOf('Mozilla/5.0 (X11; Linux x86_64)')).toBe('other');
    });
});
