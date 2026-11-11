import { describe, expect, it, vi } from 'vitest';

import { EntityLinkNode } from './EntityLinkNode';

vi.mock('./EntityLinkPill', () => ({
    default: () => null,
}));

type AttributeSpec = {
    default: unknown;
    parseHTML: (el: HTMLElement) => unknown;
};

type AddAttributesFn = () => {
    type: AttributeSpec;
    id: AttributeSpec;
    title: AttributeSpec;
    thumbnailUrl: AttributeSpec;
    deepLinkUrl: AttributeSpec;
};

type ParseHTMLFn = () => Array<{ tag: string }>;

type RenderHTMLFn = (props: {
    node: { attrs: Record<string, unknown> };
    HTMLAttributes: Record<string, unknown>;
}) => [string, Record<string, unknown>, string];

const config = EntityLinkNode.config as unknown as {
    addAttributes: AddAttributesFn;
    parseHTML: ParseHTMLFn;
    renderHTML: RenderHTMLFn;
};

function spanWith(attrs: Record<string, string>): HTMLElement {
    const el = document.createElement('span');

    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }

    return el;
}

describe('EntityLinkNode identity', () => {
    it('pins the name, inline group, and inline/atom/selectable/draggable flags — a rename breaks the persisted body_html contract', () => {
        expect(EntityLinkNode.name).toBe('cornerLink');
        expect(EntityLinkNode.config.group).toBe('inline');
        expect(EntityLinkNode.config.inline).toBe(true);
        expect(EntityLinkNode.config.atom).toBe(true);
        expect(EntityLinkNode.config.selectable).toBe(true);
        expect(EntityLinkNode.config.draggable).toBe(false);
    });
});

describe('EntityLinkNode.parseHTML', () => {
    it('returns the single span[data-corner-type] tag matcher — half of the diff-on-save contract; the other half is the DOMXPath query in ExtractsCornerLinks', () => {
        const rules = config.parseHTML.call(config);

        expect(rules).toEqual([{ tag: 'span[data-corner-type]' }]);
    });
});

describe('EntityLinkNode.addAttributes — parsing', () => {
    it('parses a well-formed element into the type string, numeric id, title, thumbnail and deep link', () => {
        const attrs = config.addAttributes();
        const el = spanWith({
            'data-corner-type': 'movie',
            'data-corner-id': '42',
            'data-corner-title': 'Inception',
            'data-corner-thumbnail': 'https://example.com/thumb.jpg',
            'data-corner-href': 'https://example.com/movie/42',
        });

        expect(attrs.type.parseHTML(el)).toBe('movie');
        expect(attrs.id.parseHTML(el)).toBe(42);
        expect(attrs.title.parseHTML(el)).toBe('Inception');
        expect(attrs.thumbnailUrl.parseHTML(el)).toBe(
            'https://example.com/thumb.jpg',
        );
        expect(attrs.deepLinkUrl.parseHTML(el)).toBe(
            'https://example.com/movie/42',
        );
    });

    it('coerces an id of zero, a non-numeric id, and a missing id all to null', () => {
        const attrs = config.addAttributes();

        expect(
            attrs.id.parseHTML(spanWith({ 'data-corner-id': '0' })),
        ).toBeNull();
        expect(
            attrs.id.parseHTML(spanWith({ 'data-corner-id': 'abc' })),
        ).toBeNull();
        expect(attrs.id.parseHTML(spanWith({}))).toBeNull();
    });

    it('coerces a missing title to the empty string', () => {
        const attrs = config.addAttributes();

        expect(attrs.title.parseHTML(spanWith({}))).toBe('');
    });

    it('coerces an empty thumbnail and an empty href each to null, not the empty string', () => {
        const attrs = config.addAttributes();

        expect(
            attrs.thumbnailUrl.parseHTML(
                spanWith({ 'data-corner-thumbnail': '' }),
            ),
        ).toBeNull();
        expect(
            attrs.deepLinkUrl.parseHTML(spanWith({ 'data-corner-href': '' })),
        ).toBeNull();
    });
});

describe('EntityLinkNode.renderHTML', () => {
    it('emits exactly FIVE data-corner-* attributes — a sixth added without bumping the HTMLPurifier history-body DefinitionRev is stripped on save, so this count is a deliberate tripwire', () => {
        const result = config.renderHTML.call(config, {
            node: {
                attrs: {
                    type: 'movie',
                    id: 42,
                    title: 'Inception',
                    thumbnailUrl: 'https://example.com/thumb.jpg',
                    deepLinkUrl: 'https://example.com/movie/42',
                },
            },
            HTMLAttributes: {},
        });

        const [, attrs] = result;
        const cornerKeys = Object.keys(attrs).filter((key) =>
            key.startsWith('data-corner-'),
        );

        expect(cornerKeys).toHaveLength(5);
    });

    it('carries the pill class and the non-editable flag, and renders the title as the element text child', () => {
        const result = config.renderHTML.call(config, {
            node: {
                attrs: {
                    type: 'movie',
                    id: 42,
                    title: 'Inception',
                    thumbnailUrl: 'https://example.com/thumb.jpg',
                    deepLinkUrl: 'https://example.com/movie/42',
                },
            },
            HTMLAttributes: {},
        });

        const [tag, attrs, textChild] = result;

        expect(tag).toBe('span');
        expect(attrs.class).toBe('tt-pill');
        expect(attrs.contenteditable).toBe('false');
        expect(textChild).toBe('Inception');
    });

    it('renders null attributes as empty strings — never the literal words null or undefined inside persisted HTML', () => {
        const result = config.renderHTML.call(config, {
            node: {
                attrs: {
                    type: null,
                    id: null,
                    title: null,
                    thumbnailUrl: null,
                    deepLinkUrl: null,
                },
            },
            HTMLAttributes: {},
        });

        const [, attrs, textChild] = result;

        expect(attrs['data-corner-type']).toBe('');
        expect(attrs['data-corner-id']).toBe('');
        expect(attrs['data-corner-title']).toBe('');
        expect(attrs['data-corner-thumbnail']).toBe('');
        expect(attrs['data-corner-href']).toBe('');
        expect(textChild).toBe('');
    });
});
