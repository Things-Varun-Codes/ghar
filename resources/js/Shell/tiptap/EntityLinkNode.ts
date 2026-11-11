/*
 * The `cornerLink` name and data-corner-* attributes are persisted in body_html. A new attribute
 * must also be added to SanitizeBodyHtml (bump DefinitionRev) and ExtractsCornerLinks.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import EntityLinkPill from './EntityLinkPill';

export const EntityLinkNode = Node.create({
    name: 'cornerLink',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            type: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute('data-corner-type'),
            },
            id: {
                default: null,
                parseHTML: (el) => {
                    const raw = (el as HTMLElement).getAttribute(
                        'data-corner-id',
                    );
                    const n = parseInt(raw ?? '0', 10);

                    return Number.isFinite(n) && n > 0 ? n : null;
                },
            },
            title: {
                default: '',
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute('data-corner-title') ?? '',
            },
            thumbnailUrl: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute('data-corner-thumbnail') ||
                    null,
            },
            deepLinkUrl: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute('data-corner-href') ||
                    null,
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-corner-type]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-corner-type': node.attrs.type ?? '',
                'data-corner-id': String(node.attrs.id ?? ''),
                'data-corner-title': node.attrs.title ?? '',
                'data-corner-thumbnail': node.attrs.thumbnailUrl ?? '',
                'data-corner-href': node.attrs.deepLinkUrl ?? '',
                class: 'tt-pill',
                contenteditable: 'false',
            }),
            node.attrs.title ?? '',
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(EntityLinkPill);
    },
});
