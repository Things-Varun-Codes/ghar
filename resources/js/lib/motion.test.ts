/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DURATION, EASE } from '@/lib/motion';

// Read from disk: Vitest hands CSS imports, ?raw included, to its CSS pipeline.
const css = readFileSync(`${process.cwd()}/resources/css/app.css`, 'utf8');

function token(name: string): string {
    const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));

    if (!match) {
        throw new Error(`--${name} is missing from app.css`);
    }

    return match[1].trim();
}

const ms = (name: string) => Number.parseFloat(token(name)) / 1000;

describe('motion tokens', () => {
    it('match app.css', () => {
        expect(DURATION).toEqual({
            press: ms('dur-press'),
            out: ms('dur-out'),
            in: ms('dur-in'),
            card: ms('dur-card'),
            sheet: ms('dur-sheet'),
            sheetOut: ms('dur-sheet-out'),
            media: ms('dur-media'),
            stagger: ms('dur-stagger'),
        });
    });

    it('share the one easing', () => {
        expect(token('ease-ui')).toBe(`cubic-bezier(${EASE.join(', ')})`);
    });

    it('leave quicker than they arrive', () => {
        expect(DURATION.out).toBeLessThan(DURATION.in);
        expect(DURATION.sheetOut).toBeLessThan(DURATION.sheet);
    });
});
