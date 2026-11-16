import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAllowTouchSelection } from '@/hooks/use-allow-touch-selection';
import { useAppAttrs } from '@/hooks/use-app-attrs';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useKeyboardViewport } from '@/hooks/use-keyboard-viewport';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useOverlayHistory } from '@/hooks/use-overlay-history';
import { cn } from '@/lib/utils';
import { MOMENT_PARAM } from '@/MiniApps/History/lib/momentUrl';
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
                'bg-foreground/55',
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
    // Portal data-app forwarding for the raw Radix primitives used below
    // (SheetPrimitive.Content + AlertDialogPrimitive.Content). The shadcn
    // wrappers in @/components/ui/* auto-forward this; raw primitives
    // need an explicit spread.
    const appAttrs = useAppAttrs();
    useAllowTouchSelection();
    const [isDirty, setIsDirty] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isFormProcessing, setIsFormProcessing] = useState(false);
    const [displayMode, setDisplayMode] = useState<'add' | 'edit' | 'read'>(
        mode,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const formRef = useRef<EventFormHandle>(null);

    // The phone pattern (bottom sheet) runs up to lg, like the shell's chrome.
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const side = isDesktop ? 'right' : 'bottom';

    const keyboard = useKeyboardViewport(open && side === 'bottom');

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

    // Back answers the innermost question first: the discard prompt (as "keep editing"), then the
    // delete prompt, then the sheet through the same dirty gate as its close button. An open
    // lightbox registers its own entry above this one, so it closes before any of these.
    useOverlayHistory(
        open,
        () => {
            if (confirmOpen) {
                setConfirmOpen(false);
            } else if (deleteOpen) {
                setDeleteOpen(false);
            } else {
                handleOpenChange(false);
            }
        },
        {
            param:
                editingEvent && mode !== 'add'
                    ? [MOMENT_PARAM, String(editingEvent.id)]
                    : null,
        },
    );

    const contentClassName = cn(
        'fixed z-50 flex flex-col shadow-lg ease-(--ease-ui) data-[state=closed]:duration-(--dur-out) data-[state=open]:duration-(--dur-card)',
        side === 'right' &&
            'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right',
        side === 'bottom' &&
            'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-bottom motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom',
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
                        {...appAttrs}
                        data-scroll-container=""
                        className={cn(
                            contentClassName,
                            'history-sheet-content',
                        )}
                        style={
                            keyboard
                                ? {
                                      top: `${keyboard.offsetTop}px`,
                                      bottom: 'auto',
                                      height: `${keyboard.height}px`,
                                  }
                                : undefined
                        }
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
                                <X
                                    aria-hidden="true"
                                    size={20}
                                    strokeWidth={1.5}
                                />
                            </SheetPrimitive.Close>
                        ) : (
                            <SheetPrimitive.Close
                                className="history-sheet-close"
                                aria-label="Close"
                            >
                                <X
                                    aria-hidden="true"
                                    size={20}
                                    strokeWidth={1.5}
                                />
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
                                        ? '32px 24px 24px'
                                        : '0 24px 24px',
                            }}
                        >
                            {displayMode === 'read' && editingEvent ? (
                                <EventReadView event={editingEvent} />
                            ) : (
                                <div className="pt-6">
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
                        {...appAttrs}
                    />
                    <AlertDialogPrimitive.Content
                        {...appAttrs}
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
