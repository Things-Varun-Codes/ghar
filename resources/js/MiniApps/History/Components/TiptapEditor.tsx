/*
 * SanitizeBodyHtml on the server is the trust boundary; nothing here sanitizes.
 *
 * The editor is uncontrolled: `content` seeds it on mount and EventSheet remounts it per event.
 * Feeding onUpdate output back through setContent rebuilds the document mid-keystroke on iOS.
 *
 * Toolbar state comes from useEditorState: TipTap 3 doesn't re-render on every transaction, so
 * editor.isActive() in render misses caret movement.
 */

import Link from '@tiptap/extension-link';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
    Bold,
    Italic,
    Heading2,
    Heading3,
    Link as LinkIcon,
    Link2,
    List,
    ListOrdered,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EntityLinkNode } from '@/Shell/tiptap/EntityLinkNode';
import EntityLinkPickerDialog from '@/Shell/tiptap/EntityLinkPickerDialog';
import type { PickedEntity } from '@/Shell/tiptap/EntityLinkPickerDialog';

type TiptapEditorProps = {
    value: string; // initial HTML (existing body_html from server, or '' for a new event)
    onChange: (html: string) => void; // fires DEBOUNCED (~300ms) with editor.getHTML()
    placeholder?: string;
    htmlRef?: React.MutableRefObject<string>;
};

const DEFAULT_PLACEHOLDER =
    'Write the story. Plain text is fine; bold, italics, headings, links, and lists are all you need.';

// Allowed link protocols (mirrors SanitizeBodyHtml's URI.AllowedSchemes).
// The server enforces; this client gate just gives instant feedback on Apply.
const LINK_PROTOCOL_RE = /^(https?:|mailto:)/i;

const ONCHANGE_DEBOUNCE_MS = 280;

const DEFAULT_TOOLBAR_STATE = {
    bold: false,
    italic: false,
    h2: false,
    h3: false,
    link: false,
    bulletList: false,
    orderedList: false,
};

export default function TiptapEditor({
    value,
    onChange,
    placeholder,
    htmlRef,
}: TiptapEditorProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flushOnChange = useCallback(
        (editorInstance: { getHTML: () => string } | null | undefined) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            if (!editorInstance) {
                return;
            }

            const html = editorInstance.getHTML();

            if (htmlRef) {
                htmlRef.current = html;
            }

            onChange(html);
        },
        [onChange, htmlRef],
    );

    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkAnchorRect, setLinkAnchorRect] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const [pickerOpen, setPickerOpen] = useState(false);

    const placeholderText = placeholder ?? DEFAULT_PLACEHOLDER;

    const extensions = useMemo(
        () => [
            StarterKit.configure({
                blockquote: false,
                code: false,
                codeBlock: false,
                strike: false,
                horizontalRule: false,
                link: false,
            }),
            // Link.extend, not configure: `inclusive` is an extension config field (TipTap #5845).
            Link.extend({ inclusive: false }).configure({
                openOnClick: false,
                autolink: true,
                protocols: ['http', 'https', 'mailto'],
                defaultProtocol: 'https',
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            EntityLinkNode,
        ],
        [],
    );

    const editor = useEditor({
        immediatelyRender: false,
        extensions,
        content: value,
        editorProps: {
            attributes: {
                class: 'history-prose tiptap-editor-content',
                'data-placeholder': placeholderText,
                // Re-enables iOS autocorrect, capitalisation and the double-space period.
                autocorrect: 'on',
                autocapitalize: 'sentences',
                spellcheck: 'true',
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': 'Story body',
            },
        },
        onUpdate({ editor }) {
            const html = editor.getHTML();

            if (htmlRef) {
                htmlRef.current = html;
            }

            // Debounced write: drives Inertia setData for dirty-tracking +
            // display only. Intentionally allowed to lag ~280ms behind
            // keystrokes.
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                onChange(html);
            }, ONCHANGE_DEBOUNCE_MS);
        },
        onBlur({ editor }) {
            // Belt-and-braces flush: converge display/dirty state even
            // without a submit (e.g. tabbing away from the editor).
            flushOnChange(editor);
        },
    });

    const editorRef = useRef<typeof editor>(null);
    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    // Belt-and-braces flush on unmount (e.g. the Sheet closes or the
    // event-id key changes) so a pending debounced write is never lost.
    useEffect(() => {
        return () => {
            flushOnChange(editorRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once cleanup; reads the latest editor via editorRef, not a dependency.
    }, []);

    const toolbarState =
        useEditorState({
            editor,
            selector: ({ editor: e }) => ({
                bold: e ? e.isActive('bold') : false,
                italic: e ? e.isActive('italic') : false,
                h2: e ? e.isActive('heading', { level: 2 }) : false,
                h3: e ? e.isActive('heading', { level: 3 }) : false,
                link: e ? e.isActive('link') : false,
                bulletList: e ? e.isActive('bulletList') : false,
                orderedList: e ? e.isActive('orderedList') : false,
            }),
            // useEditorState's return type widens to `T | null` whenever the
            // `editor` argument's TYPE is nullable (Editor | null here), even
            // though our selector above always returns a concrete object.
            // Fall back to an all-false snapshot to satisfy the type checker;
            // this branch is never actually rendered — the `if (!editor)`
            // early-return below fires first whenever editor is really null.
        }) ?? DEFAULT_TOOLBAR_STATE;

    const openLinkPopover = useCallback(() => {
        if (!editor) {
            return;
        }

        if (!wrapperRef.current) {
            return;
        }

        const { from, to } = editor.state.selection;
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        const wrapperRect = wrapperRef.current.getBoundingClientRect();

        const centreLeft = (start.left + end.right) / 2 - wrapperRect.left;
        const top = end.bottom - wrapperRect.top + 8; // 8px gap below selection
        setLinkAnchorRect({ top, left: centreLeft });

        const existing = editor.getAttributes('link').href as
            | string
            | undefined;
        setLinkUrl(existing ?? '');
        setLinkError(null);
        setLinkOpen(true);
    }, [editor]);

    const closeLinkPopover = useCallback(
        (returnFocusToToggle = false) => {
            setLinkOpen(false);
            setLinkUrl('');
            setLinkError(null);
            setLinkAnchorRect(null);

            // On Escape (returnFocusToToggle=true), return focus
            // to the Link toolbar button so keyboard users can keep navigating
            // the toolbar without losing their position. The button is found via
            // [data-tiptap-link-toggle] which is already set on the ToolbarButton
            // for the Link action (no ref-forwarding change to ToolbarButton needed).
            if (returnFocusToToggle) {
                const toggle =
                    wrapperRef.current?.querySelector<HTMLButtonElement>(
                        '[data-tiptap-link-toggle]',
                    );

                toggle?.focus();
            }
        },
        [wrapperRef],
    );

    const applyLink = useCallback(() => {
        if (!editor) {
            return;
        }

        const trimmed = linkUrl.trim();

        if (!LINK_PROTOCOL_RE.test(trimmed)) {
            setLinkError('Use a full URL, like https://example.com');

            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: trimmed })
            .run();
        closeLinkPopover();
    }, [editor, linkUrl, closeLinkPopover]);

    const removeLink = useCallback(() => {
        if (!editor) {
            return;
        }

        editor.chain().focus().unsetLink().run();
        closeLinkPopover();
    }, [editor, closeLinkPopover]);

    const insertCornerLink = useCallback(
        (entity: PickedEntity) => {
            if (!editor) {
                return;
            }

            editor
                .chain()
                .focus()
                .insertContent({
                    type: 'cornerLink',
                    attrs: {
                        type: entity.type,
                        id: entity.id,
                        title: entity.title,
                        thumbnailUrl: entity.thumbnailUrl,
                        deepLinkUrl: entity.deepLinkUrl,
                    },
                })
                .run();
        },
        [editor],
    );

    useEffect(() => {
        if (!linkOpen) {
            return;
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeLinkPopover(true);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [linkOpen, closeLinkPopover]);

    const popoverRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!linkOpen) {
            return;
        }

        const onClick = (e: MouseEvent) => {
            if (!popoverRef.current) {
                return;
            }

            if (popoverRef.current.contains(e.target as Node)) {
                return;
            }

            // Allow clicks on the link toolbar button to re-open without
            // immediately closing on the same mousedown event.
            const target = e.target as HTMLElement;

            if (target.closest('[data-tiptap-link-toggle]')) {
                return;
            }

            closeLinkPopover();
        };
        window.addEventListener('mousedown', onClick);

        return () => window.removeEventListener('mousedown', onClick);
    }, [linkOpen, closeLinkPopover]);

    if (!editor) {
        return <div className="tiptap-editor-shell" aria-busy="true" />;
    }

    const editingExistingLink = toolbarState.link;

    return (
        <div ref={wrapperRef} className="tiptap-editor-shell">
            <div
                role="toolbar"
                aria-label="Story formatting"
                className="tiptap-toolbar"
            >
                <ToolbarGroup>
                    <ToolbarButton
                        label="Bold"
                        active={toolbarState.bold}
                        onClick={() =>
                            editor.chain().focus().toggleBold().run()
                        }
                    >
                        <Bold size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Italic"
                        active={toolbarState.italic}
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                    >
                        <Italic size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                    <ToolbarButton
                        label="Heading 2"
                        active={toolbarState.h2}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 2 })
                                .run()
                        }
                    >
                        <Heading2 size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Heading 3"
                        active={toolbarState.h3}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleHeading({ level: 3 })
                                .run()
                        }
                    >
                        <Heading3 size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                    <ToolbarButton
                        label="Link"
                        active={toolbarState.link}
                        onClick={openLinkPopover}
                        dataAttrs={{ 'data-tiptap-link-toggle': '' }}
                    >
                        <LinkIcon size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                    <ToolbarButton
                        label="Bulleted list"
                        active={toolbarState.bulletList}
                        onClick={() =>
                            editor.chain().focus().toggleBulletList().run()
                        }
                    >
                        <List size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Numbered list"
                        active={toolbarState.orderedList}
                        onClick={() =>
                            editor.chain().focus().toggleOrderedList().run()
                        }
                    >
                        <ListOrdered size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarSeparator />

                <ToolbarGroup>
                    <ToolbarButton
                        label="Insert a link to an Our Corner item"
                        title="Insert a link to an Our Corner item"
                        active={false}
                        onClick={() => setPickerOpen(true)}
                    >
                        <Link2 size={18} strokeWidth={1.5} />
                    </ToolbarButton>
                </ToolbarGroup>
            </div>

            <EntityLinkPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={insertCornerLink}
            />

            <EditorContent editor={editor} />

            {linkOpen && linkAnchorRect && (
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label={editingExistingLink ? 'Edit link' : 'Add link'}
                    className="tiptap-link-popover absolute [transform:translateX(-50%)]"
                    style={{
                        top: linkAnchorRect.top,
                        left: linkAnchorRect.left,
                    }}
                >
                    <label
                        htmlFor="tiptap-link-url"
                        className="tiptap-link-popover-label"
                    >
                        {editingExistingLink ? 'Edit link' : 'Add link'}
                    </label>
                    <input
                        id="tiptap-link-url"
                        type="url"
                        inputMode="url"
                        autoFocus
                        placeholder="https://"
                        className="tiptap-link-popover-input"
                        value={linkUrl}
                        onChange={(e) => {
                            setLinkUrl(e.target.value);

                            if (linkError) {
                                setLinkError(null);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyLink();
                            }
                        }}
                    />
                    {linkError && (
                        <p role="alert" className="tiptap-link-popover-error">
                            {linkError}
                        </p>
                    )}
                    <div className="tiptap-link-popover-actions">
                        <button
                            type="button"
                            onClick={() => closeLinkPopover(false)}
                            tabIndex={-1}
                            className="tiptap-link-popover-btn tiptap-link-popover-btn--cancel"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={applyLink}
                            className="tiptap-link-popover-btn tiptap-link-popover-btn--apply"
                        >
                            {editingExistingLink ? 'Update' : 'Add'}
                        </button>
                        {editingExistingLink && (
                            <button
                                type="button"
                                onClick={removeLink}
                                className="tiptap-link-popover-btn tiptap-link-popover-btn--remove"
                            >
                                Remove link
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
    return <div className="tiptap-toolbar-group">{children}</div>;
}

function ToolbarSeparator() {
    return <div role="separator" className="tiptap-toolbar-sep" />;
}

type ToolbarButtonProps = {
    label: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    dataAttrs?: Record<string, string>;
    title?: string;
};

function ToolbarButton({
    label,
    active,
    onClick,
    children,
    dataAttrs,
    title,
}: ToolbarButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={title ?? label}
            aria-pressed={active}
            onMouseDown={(e) => {
                // Prevent the button from stealing focus from the editor,
                // which would collapse the selection and break extendMarkRange.
                e.preventDefault();
            }}
            onClick={onClick}
            className="tiptap-toolbar-btn"
            {...dataAttrs}
        >
            {children}
        </button>
    );
}
