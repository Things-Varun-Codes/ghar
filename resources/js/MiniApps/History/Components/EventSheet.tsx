import { router } from '@inertiajs/react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
} from '@/components/ui/drawer';
import { OverlayClose } from '@/components/ui/overlay-close';
import { useSheetSide } from '@/hooks/use-breakpoint';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { mutationOptions } from '@/lib/mutation';
import { cn } from '@/lib/utils';
import { HISTORY_CONFIRM_CLASSES } from '@/MiniApps/History/lib/confirmDialog';
import { MOMENT_PARAM } from '@/MiniApps/History/lib/momentUrl';
import { MOMENT_ONLY } from '@/MiniApps/History/lib/momentVisit';
import type {
    EventComment,
    HistoryEvent,
    MemberBirthday,
} from '@/MiniApps/History/lib/types';
import comments from '@/routes/apps/our-history/events/comments';
import ConfirmDialog from '@/Shell/Components/ConfirmDialog';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
import { SOMEONE } from './CommentsSection';
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
    birthdays?: MemberBirthday[];
};

export default function EventSheet({
    open,
    onOpenChange,
    mode,
    editingEvent,
    triggerRef,
    birthdays,
}: EventSheetProps) {
    const [formDirty, setFormDirty] = useState(false);
    // An unsent comment is a draft too: closing asks before throwing it away.
    const [commentDraft, setCommentDraft] = useState('');
    const [commentToDelete, setCommentToDelete] = useState<EventComment | null>(
        null,
    );
    const [deleteCommentOpen, setDeleteCommentOpen] = useState(false);
    const [isFormProcessing, setIsFormProcessing] = useState(false);
    const [displayMode, setDisplayMode] = useState<'add' | 'edit' | 'read'>(
        mode,
    );
    const [deleteOpen, setDeleteOpen] = useState(false);
    const formRef = useRef<EventFormHandle>(null);

    // The phone pattern (bottom sheet) runs up to lg, like the shell's chrome.
    const side = useSheetSide('lg');

    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reseat on open transition
            setFormDirty(false);
            setCommentDraft('');
            setDisplayMode(mode);
            setDeleteOpen(false);
            setDeleteCommentOpen(false);
        }
    }, [open, mode]);

    // An open lightbox registers its own history entry above this one, so back closes it first.
    const gate = useDraftCloseGate({
        open,
        isDirty: formDirty || commentDraft.trim() !== '',
        onClose: () => onOpenChange(false),
        onDiscard: () => {
            setFormDirty(false);
            setCommentDraft('');
        },
        closeNested: () => {
            if (deleteCommentOpen) {
                setDeleteCommentOpen(false);

                return true;
            }

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

    return (
        <Drawer
            open={open}
            swipeDirection={side === 'bottom' ? 'down' : 'right'}
            keyboardAware
            onOpenChange={(next, details) => {
                // PhotoSwipe portals to body, so a lightbox click reads as outside the sheet.
                if (
                    details.reason === 'outside-press' &&
                    (details.event.target as HTMLElement | null)?.closest(
                        '.pswp',
                    )
                ) {
                    details.cancel();

                    return;
                }

                gate.onOpenChange(next, details);
            }}
        >
            <DrawerContent
                className={cn(
                    'history-sheet-content gap-0 shadow-lg',
                    side === 'right' &&
                        'w-full max-w-[min(960px,80vw)] sm:max-w-[min(960px,80vw)]',
                    side === 'bottom' && 'h-[100dvh] pb-0',
                )}
                finalFocus={() => {
                    const trigger = triggerRef?.current;

                    return trigger?.isConnected ? trigger : true;
                }}
            >
                <OverlayClose
                    className={cn(
                        'top-3 right-3',
                        displayMode === 'read' && 'history-sheet-close-float',
                    )}
                />

                {displayMode === 'read' ? (
                    <>
                        <DrawerTitle className="sr-only">
                            {editingEvent?.title ||
                                editingEvent?.date_label ||
                                'Moment'}
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                            Read the whole moment.
                        </DrawerDescription>
                    </>
                ) : (
                    <div className="shrink-0 border-b border-b-(--history-rule) pt-6 pr-6 pb-4 pl-6">
                        <DrawerTitle className="history-sheet-title">
                            {displayMode === 'add'
                                ? 'Add a moment'
                                : 'Edit moment'}
                        </DrawerTitle>
                        <DrawerDescription className="sr-only">
                            {displayMode === 'add'
                                ? 'Fill in the details for a new moment and save it to the timeline.'
                                : 'Update the details for this moment.'}
                        </DrawerDescription>
                    </div>
                )}

                {/* The editor and the photo grid take their own drags; only the frame swipes. */}
                <div
                    data-base-ui-swipe-ignore=""
                    className="flex-1 overflow-y-auto"
                    style={{
                        padding:
                            displayMode === 'read'
                                ? '32px 24px 24px'
                                : '0 24px 24px',
                    }}
                >
                    {displayMode === 'read' && editingEvent ? (
                        <EventReadView
                            event={editingEvent}
                            commentDraft={commentDraft}
                            onCommentDraftChange={setCommentDraft}
                            onDeleteComment={(comment) => {
                                setCommentToDelete(comment);
                                setDeleteCommentOpen(true);
                            }}
                        />
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
                                              occurred_on: editingEvent.date,
                                              title: editingEvent.title ?? '',
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
                                                  editingEvent.body_html ?? '',
                                              birthday_user_id:
                                                  editingEvent.birthday_of
                                                      ?.id ?? null,
                                          }
                                        : undefined
                                }
                                initialMedia={editingEvent?.media}
                                birthdays={birthdays}
                                onDismiss={gate.requestClose}
                                onSaved={() => onOpenChange(false)}
                                onDirtyChange={setFormDirty}
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
                                onClick={() => formRef.current?.submitNormal()}
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
            </DrawerContent>

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

            {editingEvent && commentToDelete && (
                <ConfirmDialog
                    open={deleteCommentOpen}
                    onOpenChange={setDeleteCommentOpen}
                    title="Delete this comment?"
                    description={`The comment from ${commentToDelete.author?.name ?? SOMEONE} goes for everyone. There's no undo.`}
                    cancelLabel="Keep it"
                    confirmLabel="Delete comment"
                    variant="destructive"
                    onConfirm={() =>
                        router.delete(
                            comments.destroy({
                                event: editingEvent.id,
                                comment: commentToDelete.id,
                            }).url,
                            {
                                ...MOMENT_ONLY,
                                ...mutationOptions({
                                    component: 'History/EventSheet',
                                    action: 'comment.delete',
                                    message:
                                        "Couldn't delete that comment. Try again.",
                                }),
                            },
                        )
                    }
                    classNames={{
                        ...HISTORY_CONFIRM_CLASSES,
                        cancel: 'history-btn-keep-event h-auto shadow-none',
                    }}
                />
            )}

            <DiscardDraftDialog
                {...gate.prompt}
                title={
                    formDirty
                        ? 'Discard unsaved changes?'
                        : 'Discard your comment?'
                }
                description={
                    formDirty
                        ? "What you changed here won't be saved."
                        : "The comment you started won't be posted."
                }
                classNames={{
                    content: 'history-alert-dialog',
                    header: 'gap-0 text-left',
                    title: 'history-alert-title-lg',
                    description: 'history-alert-body',
                    footer: 'flex-row justify-end gap-3',
                    cancel: 'history-btn-keep-editing h-auto shadow-none',
                    action: 'history-btn-discard h-auto shadow-none',
                }}
            />
        </Drawer>
    );
}
