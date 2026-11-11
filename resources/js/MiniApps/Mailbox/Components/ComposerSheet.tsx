import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
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
import { captureSilent } from '@/lib/observability';
import type { HouseholdMember } from '@/MiniApps/Mailbox/Components/RecipientPicker';
import RecipientPicker, {
    defaultRecipientIds,
} from '@/MiniApps/Mailbox/Components/RecipientPicker';
import { store } from '@/routes/apps/our-mailbox/messages';
import ErrorState from '@/Shell/Components/ErrorState';
import SubmitButton from '@/Shell/Components/SubmitButton';

const HARD_CAP = 600;
const SOFT_CAP = 500;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: HouseholdMember[];
};

type FormShape = { recipient_ids: number[]; body: string };

export default function ComposerSheet({ open, onOpenChange, members }: Props) {
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    useBodyScrollLock(open);

    const [discardOpen, setDiscardOpen] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const form = useForm<FormShape>({
        recipient_ids: defaultRecipientIds(members),
        body: '',
    });
    const { data, setData, post, processing, errors, reset } = form;

    const { gate: dirtyGate, reset: gateReset } = useDirtyFormGate(form, {
        fields: ['body'],
    });

    useEffect(() => {
        if (open) {
            const id = window.setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);

            return () => window.clearTimeout(id);
        }

        return undefined;
    }, [open]);

    const remaining = SOFT_CAP - data.body.length;
    const showCounter = remaining <= 100;
    const isOverHard = data.body.length > HARD_CAP;
    const isOverSoft = data.body.length > SOFT_CAP;
    let counterColor = 'var(--mailbox-ink-soft)';

    if (remaining <= 0) {
        counterColor = 'var(--mailbox-destructive)';
    } else if (remaining <= 20) {
        counterColor = 'var(--mailbox-amber-warn)';
    }

    const handleOpenChange = (next: boolean) => {
        if (next) {
            setSaveError(null);
        }

        if (!dirtyGate(next)) {
            setDiscardOpen(true);

            return;
        }

        onOpenChange(next);
    };

    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: () => handleOpenChange(false),
    });

    const firstErrorMessage = errors.body ?? null;

    const submit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setSaveError(null);
        post(store.url(), {
            preserveScroll: true,
            preserveState: 'errors',
            onSuccess: () => {
                reset();
                gateReset();
                setSaveError(null);
                onOpenChange(false);
            },
            onError: (errs) => {
                setSaveError(
                    errs.body ??
                        Object.values(errs)[0] ??
                        'Could not send note',
                );
                captureSilent(new Error('mailbox.composer.submit failed'), {
                    component: 'Mailbox/ComposerSheet',
                    action: 'message.create',
                    surface: 'frontend',
                    extra: {
                        // sanitizePayload scrubs known secret keys, but we
                        // intentionally do NOT include `body` here — body
                        // text is forbidden in error logs.
                        validation_keys: Object.keys(errs ?? {}),
                    },
                });
            },
        });
    };

    const sendAnother = () => {
        setSaveError(null);
        post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset('body');
                gateReset();
                textareaRef.current?.focus();
            },
            onError: (errs) => {
                setSaveError(
                    errs.body ??
                        Object.values(errs)[0] ??
                        'Could not send note',
                );
                captureSilent(
                    new Error('mailbox.composer.send-another failed'),
                    {
                        component: 'Mailbox/ComposerSheet',
                        action: 'message.create',
                        surface: 'frontend',
                        extra: { validation_keys: Object.keys(errs ?? {}) },
                    },
                );
            },
        });
    };

    const disabled =
        processing ||
        data.body.length === 0 ||
        isOverHard ||
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
                        height: side === 'bottom' ? '85dvh' : '100dvh',
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>Write a note</SheetTitle>
                    </SheetHeader>

                    {/*
                     * Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto
                     * element.
                     */}
                    <div {...swipeHandlers} className="mailbox-sheet-scroll">
                        {saveError && (
                            <ErrorState
                                message="Could not send note"
                                cause={
                                    firstErrorMessage ?? saveError ?? undefined
                                }
                                onRetry={() => submit()}
                            />
                        )}

                        <form
                            onSubmit={submit}
                            className="flex flex-col gap-3 p-4"
                        >
                            <RecipientPicker
                                members={members}
                                value={data.recipient_ids}
                                onChange={(ids) =>
                                    setData('recipient_ids', ids)
                                }
                                errors={errors}
                            />

                            <label
                                htmlFor="mailbox-composer-body"
                                className="sr-only"
                            >
                                Note body
                            </label>
                            <textarea
                                id="mailbox-composer-body"
                                ref={textareaRef}
                                className="mailbox-hand mailbox-composer-paper mailbox-note-input"
                                value={data.body}
                                onChange={(e) =>
                                    setData('body', e.target.value)
                                }
                                maxLength={HARD_CAP}
                                rows={10}
                                placeholder="Write a note…"
                                style={{
                                    border: `1px solid ${
                                        isOverSoft
                                            ? 'var(--mailbox-destructive)'
                                            : 'var(--mailbox-border)'
                                    }`,
                                }}
                            />

                            {errors.body && (
                                <p
                                    role="alert"
                                    className="m-0 text-[13px] text-(--mailbox-destructive)"
                                >
                                    {errors.body}
                                </p>
                            )}

                            {showCounter && (
                                <>
                                    <span
                                        role="status"
                                        aria-live="polite"
                                        className="sr-only"
                                    >
                                        {remaining >= 0
                                            ? `${remaining} characters remaining`
                                            : `${Math.abs(remaining)} over the limit`}
                                    </span>
                                    <p
                                        aria-hidden="true"
                                        className="m-0 self-end text-[13px]"
                                        style={{ color: counterColor }}
                                    >
                                        {remaining >= 0
                                            ? `${remaining} characters left`
                                            : `${Math.abs(remaining)} over`}
                                    </p>
                                </>
                            )}

                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={sendAnother}
                                    disabled={disabled}
                                    className="mailbox-btn-send-another"
                                    style={{
                                        cursor: disabled
                                            ? 'not-allowed'
                                            : 'pointer',
                                    }}
                                >
                                    Send &amp; write another
                                </button>
                                <SubmitButton
                                    processing={processing}
                                    disabled={disabled}
                                    busyText="Sending…"
                                >
                                    Send note
                                </SubmitButton>
                            </div>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent data-app="our-mailbox">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your draft will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep writing</AlertDialogCancel>
                        <AlertDialogAction
                            className={buttonVariants({
                                variant: 'destructive',
                            })}
                            onClick={() => {
                                setDiscardOpen(false);
                                reset();
                                gateReset();
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
