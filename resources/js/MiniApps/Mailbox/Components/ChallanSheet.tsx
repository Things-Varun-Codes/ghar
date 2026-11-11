import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { store } from '@/routes/apps/our-mailbox/challans';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type ChallanFormShape = {
    recipient_ids: number[];
    offence: string;
    incident_date: string;
    incident_place: string;
    is_repeat: boolean;
    penalty: string;
    remarks: string;
};

const REMARKS_MAX = 500;

export default function ChallanSheet({ open, onOpenChange, members }: Props) {
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    useBodyScrollLock(open);

    const [discardOpen, setDiscardOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const form = useForm<ChallanFormShape>({
        recipient_ids: defaultRecipientIds(members),
        offence: '',
        incident_date: '',
        incident_place: '',
        is_repeat: false,
        penalty: '',
        remarks: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['offence', 'incident_place', 'penalty', 'remarks'],
    });

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setSaveError(null);
        }

        if (!next && isDirty) {
            setDiscardOpen(true);

            return;
        }

        onOpenChange(next);
    };

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: () => handleOpenChange(false),
    });

    const handleReset = () => {
        reset();
        gateReset();
        setSaveError(null);
        setDiscardOpen(false);
    };

    const handleSubmit = () => {
        setSaveError(null);
        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                handleReset();
                onOpenChange(false);
            },
            onError: (errs) => {
                const first = Object.values(errs)[0] ?? null;
                setSaveError(
                    first ?? 'Could not file the citation. Try again.',
                );
            },
        });
    };

    const submitDisabled =
        processing ||
        data.offence.trim() === '' ||
        data.penalty.trim() === '' ||
        data.recipient_ids.length === 0;

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side={side}
                    data-app="our-mailbox"
                    className="mailbox-sheet-content [&_button.absolute]:!opacity-100"
                    style={{
                        maxWidth: side === 'right' ? '640px' : undefined,
                        width: side === 'right' ? '90vw' : '100%',
                        height: side === 'bottom' ? '90dvh' : '100dvh',
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>Issue a challan</SheetTitle>
                    </SheetHeader>

                    {/*
                     * Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto
                     * element.
                     */}
                    <div {...swipeHandlers} className="mailbox-sheet-scroll">
                        <div className="flex flex-col gap-4.5 p-4">
                            <RecipientPicker
                                legend="Issue to"
                                members={members}
                                value={data.recipient_ids}
                                onChange={(ids) =>
                                    setData('recipient_ids', ids)
                                }
                                errors={errors}
                            />

                            <div>
                                <label
                                    htmlFor="challan-offence"
                                    className="mailbox-field-label"
                                >
                                    Offence charged
                                </label>
                                <input
                                    id="challan-offence"
                                    type="text"
                                    maxLength={120}
                                    value={data.offence}
                                    onChange={(e) =>
                                        setData('offence', e.target.value)
                                    }
                                    placeholder="e.g. Replied with just 'k' to a whole paragraph"
                                    className="mailbox-field"
                                />
                                {errors.offence && (
                                    <p
                                        role="alert"
                                        className="mailbox-field-error"
                                    >
                                        {errors.offence}
                                    </p>
                                )}
                            </div>

                            <div className="challan-incident-grid grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                                <div>
                                    <label
                                        htmlFor="challan-date"
                                        className="mailbox-field-label"
                                    >
                                        Date of incident
                                    </label>
                                    <input
                                        id="challan-date"
                                        type="date"
                                        value={data.incident_date}
                                        onChange={(e) =>
                                            setData(
                                                'incident_date',
                                                e.target.value,
                                            )
                                        }
                                        className="mailbox-field"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="challan-place"
                                        className="mailbox-field-label"
                                    >
                                        Place
                                    </label>
                                    <input
                                        id="challan-place"
                                        type="text"
                                        maxLength={120}
                                        value={data.incident_place}
                                        onChange={(e) =>
                                            setData(
                                                'incident_place',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. the group chat"
                                        className="mailbox-field"
                                    />
                                </div>
                            </div>

                            <label className="mailbox-check-label">
                                <input
                                    type="checkbox"
                                    checked={data.is_repeat}
                                    onChange={(e) =>
                                        setData('is_repeat', e.target.checked)
                                    }
                                />
                                Repeat offender
                            </label>

                            <div>
                                <label
                                    htmlFor="challan-penalty"
                                    className="mailbox-field-label"
                                >
                                    Penalty
                                </label>
                                <input
                                    id="challan-penalty"
                                    type="text"
                                    maxLength={80}
                                    value={data.penalty}
                                    onChange={(e) =>
                                        setData('penalty', e.target.value)
                                    }
                                    placeholder="e.g. 3 hugs, payable on demand"
                                    className="mailbox-field"
                                />
                                {errors.penalty && (
                                    <p
                                        role="alert"
                                        className="mailbox-field-error"
                                    >
                                        {errors.penalty}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="challan-remarks"
                                    className="mailbox-field-label"
                                >
                                    Remarks (optional)
                                </label>
                                <textarea
                                    id="challan-remarks"
                                    className="mailbox-hand mailbox-hand-textarea mailbox-field"
                                    value={data.remarks}
                                    onChange={(e) =>
                                        setData('remarks', e.target.value)
                                    }
                                    rows={3}
                                    maxLength={REMARKS_MAX}
                                    placeholder="Any notes for the record…"
                                />
                            </div>

                            {saveError && (
                                <p role="alert" className="mailbox-field-error">
                                    {saveError}
                                </p>
                            )}

                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitDisabled}
                                    className="mailbox-btn-submit"
                                    style={{
                                        cursor: submitDisabled
                                            ? 'not-allowed'
                                            : 'pointer',
                                        opacity: submitDisabled ? 0.6 : 1,
                                    }}
                                >
                                    {processing ? 'Filing…' : 'Issue'}
                                </button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discard this citation?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            The details you entered will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                handleReset();
                                onOpenChange(false);
                            }}
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
