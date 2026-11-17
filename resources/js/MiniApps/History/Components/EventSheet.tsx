import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OverlayClose } from '@/components/ui/overlay-close';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useHasSidebar } from '@/hooks/use-breakpoint';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { useKeyboardViewport } from '@/hooks/use-keyboard-viewport';
import { cn } from '@/lib/utils';
import { MOMENT_PARAM } from '@/MiniApps/History/lib/momentUrl';
import type { HistoryEvent } from '@/MiniApps/History/lib/types';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
import DeleteEventDialog from './DeleteEventDialog';
import EventForm from './EventForm';
import type { EventFormHandle } from './EventForm';
import EventReadView from './EventReadView';

type EventSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'add' | 'edit' | 'read';
    editingEvent: HistoryEvent | null;
    /* Gets focus back on close when it isn't what had focus on open (a calendar day's menu row). */
    triggerRef?: React.RefObject<HTMLElement | null>;
};

export default function EventSheet({
    open,
    onOpenChange,
    mode,
    editingEvent,
    triggerRef,
}: EventSheetProps) {
    const [isDirty, setIsDirty] = useState(false);
    const [isFormProcessing, setIsFormProcessing] = useState(false);
    const [displayMode, setDisplayMode] = useState<'add' | 'edit' | 'read'>(
        mode,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const formRef = useRef<EventFormHandle>(null);

    // The phone pattern (bottom sheet) runs up to lg, like the shell's chrome.
    const isDesktop = useHasSidebar();
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

    // An open lightbox registers its own history entry above this one, so back closes it first.
    const gate = useDraftCloseGate({
        open,
        isDirty,
        onClose: () => onOpenChange(false),
        onDiscard: () => setIsDirty(false),
        closeNested: () => {
            if (!deleteOpen) {
                return false;
            }

            setDeleteOpen(false);

            return true;
        },
        param:
            editingEvent && mode !== 'add'
                ? [MOMENT_PARAM, String(editingEvent.id)]
                : null,
    });

    // PhotoSwipe portals to body, so Radix sees lightbox clicks as outside the sheet.
    const keepForLightbox = (e: Event) => {
        if ((e.target as HTMLElement | null)?.closest('.pswp')) {
            e.preventDefault();
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={gate.onOpenChange}>
                <SheetContent
                    side={side}
                    showCloseButton={false}
                    className={cn(
                        'history-sheet-content gap-0 shadow-lg',
                        side === 'right' &&
                            'w-full max-w-[min(960px,80vw)] sm:max-w-[min(960px,80vw)]',
                        side === 'bottom' && 'h-[100dvh] pb-0',
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
                    onPointerDownOutside={keepForLightbox}
                    onInteractOutside={keepForLightbox}
                    onCloseAutoFocus={(e) => {
                        const trigger = triggerRef?.current;

                        if (trigger?.isConnected) {
                            e.preventDefault();
                            trigger.focus();
                        }
                    }}
                >
                    <OverlayClose
                        className={cn(
                            'top-3 right-3',
                            displayMode === 'read' &&
                                'history-sheet-close-float',
                        )}
                    />

                    {displayMode === 'read' ? (
                        <>
                            <SheetTitle className="sr-only">
                                {editingEvent?.title ||
                                    editingEvent?.date_label ||
                                    'Moment'}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                Read the whole moment.
                            </SheetDescription>
                        </>
                    ) : (
                        <div className="shrink-0 border-b border-b-(--history-rule) pt-6 pr-6 pb-4 pl-6">
                            <SheetTitle className="history-sheet-title">
                                {displayMode === 'add'
                                    ? 'Add a moment'
                                    : 'Edit moment'}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {displayMode === 'add'
                                    ? 'Fill in the details for a new moment and save it to the timeline.'
                                    : 'Update the details for this moment.'}
                            </SheetDescription>
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
                                                      editingEvent.title ?? '',
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
                                    onDismiss={gate.requestClose}
                                    onSaved={() => onOpenChange(false)}
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
                                        onClick={() => setDisplayMode('edit')}
                                        className="history-btn-edit h-auto shadow-none"
                                    >
                                        Edit
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={gate.requestClose}
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
                                    onClick={gate.requestClose}
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
                </SheetContent>
            </Sheet>

            {editingEvent &&
                displayMode === 'read' &&
                editingEvent.can.delete && (
                    <DeleteEventDialog
                        open={deleteOpen}
                        onOpenChange={setDeleteOpen}
                        eventId={editingEvent.id}
                        onDeleted={() => onOpenChange(false)}
                    />
                )}

            <DiscardDraftDialog
                {...gate.prompt}
                title="Discard unsaved changes?"
                description="What you changed here won't be saved."
                classNames={{
                    content: 'history-alert-dialog history-discard-dialog',
                    header: 'gap-0 text-left',
                    title: 'history-alert-title-lg',
                    description: 'history-alert-body',
                    footer: 'flex-row justify-end gap-3',
                    cancel: 'history-btn-keep-editing h-auto shadow-none',
                    action: 'history-btn-discard h-auto shadow-none',
                }}
            />
        </>
    );
}
