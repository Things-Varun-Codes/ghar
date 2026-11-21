import { describe, expect, it } from 'vitest';
import { toSlide } from './MediaLightbox';

describe('toSlide', () => {
    it('opens on the medium copy, sized to its bound', () => {
        const slide = toSlide({
            kind: 'photo',
            original: '/o.jpg',
            medium: '/m.webp',
            width: 4000,
            height: 3000,
        });

        expect(slide).toMatchObject({
            src: '/m.webp',
            width: 1200,
            height: 900,
        });
    });

    it('never enlarges a photo smaller than the bound', () => {
        const slide = toSlide({
            kind: 'photo',
            original: '/o.jpg',
            medium: '/m.webp',
            width: 800,
            height: 600,
        });

        expect(slide).toMatchObject({
            src: '/m.webp',
            width: 800,
            height: 600,
        });
    });

    it('gives a video its poster and no srcset', () => {
        const slide = toSlide({
            kind: 'video',
            original: '/v.mp4',
            poster: '/p.webp',
        });

        expect(slide).toMatchObject({ type: 'video', poster: '/p.webp' });
        expect(slide.src).toBe('/v.mp4');
    });
});

it('lets the browser choose between the medium and large copies', () => {
    const slide = toSlide({
        kind: 'photo',
        original: '/o.jpg',
        medium: '/m.webp',
        large: '/l.webp',
        width: 4000,
        height: 3000,
    });

    expect(slide).toMatchObject({
        src: '/l.webp',
        srcset: '/m.webp 1200w, /l.webp 2400w',
        width: 2400,
        height: 1800,
    });
});

it('falls back to the original while the copy is still being made', () => {
    expect(toSlide({ kind: 'photo', original: '/o.jpg' }).src).toBe('/o.jpg');
});
