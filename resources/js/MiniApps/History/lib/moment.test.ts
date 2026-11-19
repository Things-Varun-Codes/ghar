import { describe, expect, it } from 'vitest';
import { displayLocation, storyText } from './moment';

const none = {
    location_name: null,
    location_address: null,
    location_freetext: null,
};

describe('displayLocation', () => {
    it('prints the name unless the address already holds it', () => {
        expect(
            displayLocation({
                ...none,
                location_name: 'Cubbon Park',
                location_address: 'Kasturba Road, Bengaluru',
            }),
        ).toBe('Cubbon Park');
        expect(
            displayLocation({
                ...none,
                location_name: 'Bengaluru',
                location_address: 'Bengaluru, Karnataka',
            }),
        ).toBe('Bengaluru, Karnataka');
    });

    it('falls back to the typed place, then nothing', () => {
        expect(
            displayLocation({ ...none, location_freetext: 'Grandma’s' }),
        ).toBe('Grandma’s');
        expect(displayLocation(none)).toBeNull();
    });
});

describe('storyText', () => {
    it('runs the blocks of a story into one line of text', () => {
        expect(
            storyText('<h2>Day one</h2><p>Rain all<br>the way.</p><p>Tea.</p>'),
        ).toBe('Day one · Rain all the way. Tea.');
    });

    it('ends without a dot when the story ends on a heading', () => {
        expect(storyText('<p>Tea.</p><h2>Later</h2>')).toBe('Tea. Later');
        expect(storyText('<h2>Only a heading</h2>')).toBe('Only a heading');
    });

    it('keeps markup as text and runs nothing', () => {
        expect(
            storyText('<p>&lt;b&gt; <img src=x onerror="boom()">ok</p>'),
        ).toBe('<b> ok');
    });

    it('is empty without a story', () => {
        expect(storyText(null)).toBe('');
        expect(storyText('<p></p>')).toBe('');
    });
});
