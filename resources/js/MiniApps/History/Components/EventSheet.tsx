import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAllowTouchSelection } from '@/hooks/use-allow-touch-selection';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useThemeAttrs } from '@/hooks/use-theme-attrs';
import { cn } from '@/lib/utils';
import type { EventPermissions } from './CalendarMonth';
import DeleteEventDialog from './DeleteEventDialog';
import EventForm from './EventForm';
import type { EventFormHandle } from './EventForm';
import EventReadView from './EventReadView';
import type { MediaItem } from './MediaGrid';

type Change = {
    id: number;
    action: string;
    summary: string;
    user_name: string;
    created_at: string;
};

type HistoryEvent = {
    id: number;
    date: string;
    date_label: string;
    title: string | null;
    location_freetext: string | null;
    location_place_id: string | null;
    location_name: string | null;
    location_address: string | null;
    location_lat: number | null;
    location_lng: number | null;
    body_html: string | null;
    media: MediaItem[];
    changes: Change[];
    can: EventPermissions;
};

type EventSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'add' | 'edit' | 'read';
    editingEvent: HistoryEvent | null;
    triggerRef?: React.RefObject<HTMLElement | null>;
};

function HistorySheetOverlay({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            data-slot="sheet-overlay"
            className={cn(
                'fixed inset-0 z-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                className,
                'bg-[rgba(45,36,27,0.55)]',
            )}
            {...props}
        />
    );
}

export default function EventSheet({
    open,
    onOpenChange,
    mode,
    editingEvent,
    triggerRef,
}: EventSheetProps) {
    // Portal-theme forwarding for the raw Radix primitives used below
    // (SheetPrimitive.Content + AlertDialogPrimitive.Content). The shadcn
    // wrappers in @/components/ui/* auto-forward this; raw primitives
    // need an explicit spread.
    const themeAttrs = useThemeAttrs();
    useAllowTouchSelection();
    const [isDirty, setIsDirty] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isFormProcessing, setIsFormProcessing] = useState(false);
    const [displayMode, setDisplayMode] = useState<'add' | 'edit' | 'read'>(
        mode,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const formRef = useRef<EventFormHandle>(null);

    const isDesktop = useMediaQuery('(min-width: 720px)');
    const side = isDesktop ? 'right' : 'bottom';

    const prefersReducedMotion = useMediaQuery(
        '(prefers-reduced-motion: reduce)',
    );

    // iOS dvh does not shrink for the keyboard; visualViewport is the only signal for the covered
    // area.
    const [vvMetrics, setVvMetrics] = useState<{
        height: number;
        offsetTop: number;
        keyboardUp: boolean;
    } | null>(null);
    useEffect(() => {
        if (!open || side !== 'bottom') {
            return;
        }

        const vv = window.visualViewport;

        if (!vv) {
            return;
        }

        const sync = () => {
            // Orientation guard — iOS landscape has a wider but
            // shorter viewport; the soft-keyboard-height heuristic (~100px gap)
            // fires false positives in landscape when the URL bar collapses
            // because the gap between innerHeight and vv.height can exceed 100px
            // at wide-short aspect ratios. Skip repositioning in landscape;
            // the Sheet already fits within the visible area there.
            if (!window.matchMedia('(orientation: portrait)').matches) {
                setVvMetrics(null);

                return;
            }

            // Threshold: anything more than 100px of viewport "missing"
            // means a keyboard or other on-screen overlay is up. iOS Safari
            // URL bar collapse only shrinks the layout viewport by ~50px,
            // so 100px discriminates keyboard-up from URL-bar-show without
            // false positives in portrait.
            const keyboardUp =
                window.innerHeight - vv.height - vv.offsetTop > 100;
            setVvMetrics({
                height: vv.height,
                offsetTop: vv.offsetTop,
                keyboardUp,
            });
        };
        sync();
        vv.addEventListener('resize', sync);
        vv.addEventListener('scroll', sync);

        return () => {
            vv.removeEventListener('resize', sync);
            vv.removeEventListener('scroll', sync);
            setVvMetrics(null);
        };
    }, [open, side]);

    useBodyScrollLock(open);

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reseat on open transition
            setIsDirty(false);
            setDisplayMode(mode);
            setDeleteOpen(false);
        }
    }, [open, mode]);

    function handleOpenChange(next: boolean) {
        if (!next && isDirty) {
            setConfirmOpen(true);

            return; // Abort close — waiting for user decision
        }

        closeAndReturn(next);
    }

    function closeAndReturn(next: boolean) {
        onOpenChange(next);

        if (!next) {
            requestAnimationFrame(() => {
                triggerRef?.current?.focus();
            });
        }
    }

    function discardAndClose() {
        setIsDirty(false);
        setConfirmOpen(false);
        closeAndReturn(false);
    }

    const contentClassName = cn(
        'fixed z-50 flex flex-col shadow-lg transition ease-in-out',
        'data-[state=closed]:duration-300 data-[state=open]:duration-500',
        !prefersReducedMotion && [
            side === 'right' &&
                'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            side === 'bottom' &&
                'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
        ],
        side === 'right' &&
            'inset-y-0 right-0 h-full w-full max-w-[min(960px,80vw)] border-l',
        side === 'bottom' && 'inset-x-0 bottom-0 h-[100dvh] border-t',
    );

    return (
        <>
            <SheetPrimitive.Root open={open} onOpenChange={handleOpenChange}>
                <SheetPrimitive.Portal>
                    <HistorySheetOverlay />

                    <SheetPrimitive.Content
                        {...themeAttrs}
                        data-scroll-container=""
                        className={cn(
                            contentClassName,
                            'history-sheet-content',
                        )}
                        style={{
                            ...(side === 'bottom' && vvMetrics?.keyboardUp
                                ? {
                                      top: `${vvMetrics.offsetTop}px`,
                                      bottom: 'auto',
                                      height: `${vvMetrics.height}px`,
                                  }
                                : {}),
                        }}
                        onEscapeKeyDown={(e) => {
                            if (isDirty) {
                                e.preventDefault();
                                setConfirmOpen(true);
                            }
                        }}
                        onPointerDownOutside={(e) => {
                            // PhotoSwipe portals to body, so Radix sees lightbox clicks as outside
                            // the sheet.
                            if ((e.target as HTMLElement).closest('.pswp')) {
                                e.preventDefault();

                                return;
                            }

                            if (isDirty) {
                                e.preventDefault();
                                setConfirmOpen(true);
                            }
                        }}
                        onInteractOutside={(e) => {
                            // PhotoSwipe portals to body, so Radix sees lightbox clicks as outside
                            // the sheet.
                            if ((e.target as HTMLElement).closest('.pswp')) {
                                e.preventDefault();

                                return;
                            }

                            // No dirty-gate fall-through here on purpose: onPointerDownOutside
                            // already
                            // catches the dirty-pointer case. Adding a second confirm trigger here
                            // would double-fire the AlertDialog on a single user gesture.
                        }}
                    >
                        {displayMode === 'read' ? (
                            <SheetPrimitive.Close
                                className="history-sheet-close-float"
                                aria-label="Close"
                            >
                                ×
                            </SheetPrimitive.Close>
                        ) : (
                            <SheetPrimitive.Close
                                className="history-sheet-close"
                                aria-label="Close"
                            >
                                ×
                            </SheetPrimitive.Close>
                        )}

                        {displayMode === 'read' ? (
                            <>
                                <SheetPrimitive.Title className="sr-only">
                                    {editingEvent?.title ||
                                        editingEvent?.date_label ||
                                        'Event'}
                                </SheetPrimitive.Title>
                                <SheetPrimitive.Description className="sr-only">
                                    Read the whole moment.
                                </SheetPrimitive.Description>
                            </>
                        ) : (
                            <div className="shrink-0 border-b border-b-(--history-rule) pt-6 pr-6 pb-4 pl-6">
                                <SheetPrimitive.Title className="history-sheet-title">
                                    {displayMode === 'add'
                                        ? 'Add a moment'
                                        : 'Edit moment'}
                                </SheetPrimitive.Title>
                                <SheetPrimitive.Description className="sr-only">
                                    {displayMode === 'add'
                                        ? 'Fill in the details for a new event and save it to the timeline.'
                                        : 'Update the details for this event.'}
                                </SheetPrimitive.Description>
                            </div>
                        )}

                        <div
                            className="flex-1 overflow-y-auto"
                            style={{
                                padding:
                                    displayMode === 'read'
                                        ? '28px 20px 20px 20px'
                                        : '0 20px 20px 20px',
                            }}
                        >
                            {displayMode === 'read' && editingEvent ? (
                                <EventReadView event={editingEvent} />
                            ) : (
                                <div className="pt-5">
                                    {/*
                                     * Keyed on the event id: the editor is uncontrolled, so showing
                                     * another event needs a remount.
                                     */}
                                    <EventForm
                                        key={editingEvent?.id ?? 'new'}
                                        ref={formRef}
                                        eventId={editingEvent?.id ?? null}
                                        initialEvent={
                                            editingEvent
                                                ? {
                                                      occurred_on:
                                                          editingEvent.date,
                                                      title:
                                                          editingEvent.title ??
                                                          '',
                                                      location_freetext:
                                                          editingEvent.location_freetext,
                                                      location_place_id:
                                                          editingEvent.location_place_id,
                                                      location_name:
                                                          editingEvent.location_name,
                                                      location_address:
                                                          editingEvent.location_address,
                                                      location_lat:
                                                          editingEvent.location_lat,
                                                      location_lng:
                                                          editingEvent.location_lng,
                                                      body_html:
                                                          editingEvent.body_html ??
                                                          '',
                                                  }
                                                : undefined
                                        }
                                        initialMedia={editingEvent?.media}
                                        onDismiss={() =>
                                            handleOpenChange(false)
                                        }
                                        onSaved={() => closeAndReturn(false)}
                                        onDirtyChange={setIsDirty}
                                        onProcessingChange={setIsFormProcessing}
                                        onCreated={() => setDisplayMode('edit')}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="history-sheet-footer">
                            {displayMode === 'read' && editingEvent ? (
                                <>
                                    {editingEvent.can.delete && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setDeleteOpen(true)}
                                            className="history-event-delete-btn history-btn-delete h-auto shadow-none"
                                            aria-label={`Delete moment "${editingEvent.title || editingEvent.date_label}"`}
                                        >
                                            Delete
                                        </Button>
                                    )}

                                    {editingEvent.can.update && (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setDisplayMode('edit')
                                            }
                                            className="history-btn-edit h-auto shadow-none"
                                        >
                                            Edit
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => handleOpenChange(false)}
                                        className="history-btn-close h-auto shadow-none"
                                    >
                                        Close
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleOpenChange(false)}
                                        className="history-btn-cancel h-auto shadow-none"
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={() =>
                                            formRef.current?.submitNormal()
                                        }
                                        disabled={isFormProcessing}
                                        className="history-btn-save h-auto shadow-none"
                                        style={{
                                            cursor: isFormProcessing
                                                ? 'not-allowed'
                                                : 'pointer',
                                            opacity: isFormProcessing ? 0.7 : 1,
                                        }}
                                    >
                                        {isFormProcessing
                                            ? 'Saving…'
                                            : displayMode === 'add'
                                              ? 'Save moment'
                                              : 'Save changes'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </SheetPrimitive.Content>
                </SheetPrimitive.Portal>
            </SheetPrimitive.Root>

            {editingEvent &&
                displayMode === 'read' &&
                editingEvent.can.delete && (
                    <DeleteEventDialog
                        open={deleteOpen}
                        onOpenChange={setDeleteOpen}
                        eventId={editingEvent.id}
                        onDeleted={() => closeAndReturn(false)}
                    />
                )}

            <AlertDialogPrimitive.Root
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
            >
                <AlertDialogPrimitive.Portal>
                    <AlertDialogPrimitive.Overlay
                        className="history-alert-overlay"
                        {...themeAttrs}
                    />
                    <AlertDialogPrimitive.Content
                        {...themeAttrs}
                        className="history-alert-dialog"
                    >
                        <AlertDialogPrimitive.Title className="history-alert-title-lg">
                            Discard unsaved changes?
                        </AlertDialogPrimitive.Title>
                        <AlertDialogPrimitive.Description className="history-alert-body">
                            Your edits will be lost.
                        </AlertDialogPrimitive.Description>
                        <div className="flex justify-end gap-3">
                            <AlertDialogPrimitive.Cancel asChild>
                                <button
                                    type="button"
                                    className="history-btn-keep-editing"
                                >
                                    Keep editing
                                </button>
                            </AlertDialogPrimitive.Cancel>
                            <AlertDialogPrimitive.Action asChild>
                                <button
                                    type="button"
                                    onClick={() => discardAndClose()}
                                    className="history-btn-discard"
                                >
                                    Discard
                                </button>
                            </AlertDialogPrimitive.Action>
                        </div>
                    </AlertDialogPrimitive.Content>
                </AlertDialogPrimitive.Portal>
            </AlertDialogPrimitive.Root>
        </>
    );
}
