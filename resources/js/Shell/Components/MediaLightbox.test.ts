import { describe, expect, it } from 'vitest';
import { toSlide } from './MediaLightbox';

describe('toSlide', () => {
    it('opens on the medium copy and keeps the original for zoom', () => {
        const slide = toSlide({
            kind: 'photo',
            original: '/o.jpg',
            medium: '/m.webp',
            width: 4000,
            height: 3000,
        });

        expect(slide).toMatchObject({
            src: '/o.jpg',
            width: 4000,
            height: 3000,
        });
        expect(slide.srcset).toBe('/m.webp 1200w, /o.jpg 4000w');
    });

    it('never claims the medium copy is larger than the original', () => {
        const slide = toSlide({
            kind: 'photo',
            original: '/o.jpg',
            medium: '/m.webp',
            width: 800,
            height: 600,
        });

        expect(slide.srcset).toBe('/m.webp 800w, /o.jpg 800w');
    });

    it('gives a video its poster and no srcset', () => {
        const slide = toSlide({
            kind: 'video',
            original: '/v.mp4',
            poster: '/p.webp',
        });

        expect(slide).toMatchObject({ type: 'video', poster: '/p.webp' });
        expect(slide.srcset).toBeUndefined();
    });
});
