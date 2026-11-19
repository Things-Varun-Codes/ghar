import { describe, expect, it } from 'vitest';
import {
    MAX_SOURCE_BYTES,
    outputSize,
    pictureProblem,
} from '@/Shell/lib/profile-picture';

function file(type: string, size = 1024): File {
    const f = new File(['x'], 'picked', { type });
    Object.defineProperty(f, 'size', { value: size });

    return f;
}

describe('pictureProblem', () => {
    it('accepts the photos a phone or a computer hands over', () => {
        for (const type of [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
        ]) {
            expect(pictureProblem(file(type))).toBeNull();
        }
    });

    it('refuses what is not a picture, and SVG', () => {
        expect(pictureProblem(file('application/pdf'))).toMatch(/JPEG/);
        expect(pictureProblem(file(''))).toMatch(/JPEG/);
        expect(pictureProblem(file('image/svg+xml'))).toMatch(/JPEG/);
    });

    it('refuses a file too big to decode', () => {
        expect(
            pictureProblem(file('image/jpeg', MAX_SOURCE_BYTES + 1)),
        ).toMatch(/too big/);
        expect(pictureProblem(file('image/jpeg', MAX_SOURCE_BYTES))).toBeNull();
    });
});

describe('outputSize', () => {
    it('caps a large crop at 512px', () => {
        expect(outputSize({ x: 0, y: 0, width: 3000, height: 3000 })).toBe(512);
    });

    it('keeps a smaller crop at its own size', () => {
        expect(outputSize({ x: 10, y: 10, width: 300.4, height: 300.4 })).toBe(
            300,
        );
    });

    it('never goes below what the server accepts', () => {
        expect(outputSize({ x: 0, y: 0, width: 20, height: 20 })).toBe(64);
    });

    it('uses the shorter side of a crop that is a pixel off square', () => {
        expect(outputSize({ x: 0, y: 0, width: 401, height: 400 })).toBe(400);
    });
});
