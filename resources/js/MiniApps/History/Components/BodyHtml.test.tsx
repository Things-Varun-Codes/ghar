import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BodyHtml from './BodyHtml';

const story = '<h2>Morning</h2><p>Tea.</p><h3>Later</h3><h1>Old</h1>';

function headings(container: HTMLElement) {
    return Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
        (h) => `${h.tagName.toLowerCase()}.${h.className}`,
    );
}

describe('BodyHtml headings', () => {
    it('keeps the written levels by default', () => {
        const { container } = render(<BodyHtml html={story} />);

        expect(headings(container)).toEqual([
            'h2.history-prose-h2',
            'h3.history-prose-h3',
            'h2.history-prose-h2',
        ]);
    });

    it('ranks the story below a card title (h3) and keeps the look', () => {
        const { container } = render(<BodyHtml html={story} headingBase={3} />);

        expect(headings(container)).toEqual([
            'h4.history-prose-h2',
            'h5.history-prose-h3',
            'h4.history-prose-h2',
        ]);
    });

    it('never goes past h6', () => {
        const { container } = render(
            <BodyHtml html="<h3>Deep</h3>" headingBase={5} />,
        );

        expect(headings(container)).toEqual(['h6.history-prose-h3']);
    });
});
