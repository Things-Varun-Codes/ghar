import { useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { OverlayClose } from '@/components/ui/overlay-close';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { useDraftCloseGate } from '@/hooks/use-draft-close-gate';
import { useKeyboardViewport } from '@/hooks/use-keyboard-viewport';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';
import { cn } from '@/lib/utils';
import { LIST_ICONS } from '@/MiniApps/Corner/lib/list-icons';
import type { ListSettings } from '@/MiniApps/Corner/lib/presets';
import {
    BLANK_LIST,
    DONE_WORDS,
    KINDS,
    TODO_FOR_DONE,
} from '@/MiniApps/Corner/lib/presets';
import type { CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { store, update } from '@/routes/apps/our-corner/lists';
import DiscardDraftDialog from '@/Shell/Components/DiscardDraftDialog';
import FormField from '@/Shell/Components/FormField';
import HeartMark from '@/Shell/Components/HeartMark';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /* The list being changed; without one the sheet makes a new list. */
    list?: CornerListInfo;
};

function settingsOf(list: CornerListInfo): ListSettings {
    return {
        name: list.name,
        kind: list.kind,
        icon: list.icon,
        done_label: list.done_label,
        todo_label: list.todo_label,
        done_icon: list.done_icon,
        notify_on_add: list.notify_on_add,
    };
}

/*
 * Everything a household can say about a list: what it's called, its icon, what kind of thing
 * goes in it (only while making it: a place can't become a link), and the words and mark for
 * done.
 */
export default function ListSettingsSheet({ open, onOpenChange, list }: Props) {
    const isEdit = list !== undefined;
    const isWide = useMediaQuery('(min-width: 720px)');
    const side = isWide ? 'right' : 'bottom';
    const keyboard = useKeyboardViewport(open && side === 'bottom');
    const ids = useId();

    useBodyScrollLock(open);

    const form = useForm<ListSettings>(list ? settingsOf(list) : BLANK_LIST);
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const close = () => onOpenChange(false);
    const gate = useDraftCloseGate({
        open,
        isDirty,
        onClose: close,
        onDiscard: () => {
            reset();
            gateReset();
        },
    });
    const swipeHandlers = useSwipeDismiss({
        enabled: side === 'bottom',
        onDismiss: gate.requestClose,
    });

    const pickDoneWord = (word: string) => {
        setData((prev) => ({
            ...prev,
            done_label: word,
            todo_label: TODO_FOR_DONE[word] ?? prev.todo_label,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                gateReset();
                close();
            },
        };

        if (isEdit) {
            // What goes in a list is fixed once it exists; the server refuses a kind on update.
            form.transform((settings) => {
                const changes: Partial<ListSettings> = { ...settings };
                delete changes.kind;

                return changes;
            });
            // The page's own props carry the list, so it must be re-read rather than kept.
            patch(update.url(list.id), { ...options, preserveState: false });
        } else {
            post(store.url(), options);
        }
    };

    const doneIsPreset = DONE_WORDS.includes(data.done_label);

    return (
        <>
            <Sheet open={open} onOpenChange={gate.onOpenChange}>
                <SheetContent
                    side={side}
                    showCloseButton={false}
                    className={cn(
                        'corner-sheet-content gap-0 shadow-lg',
                        side === 'right' &&
                            'w-[90vw] max-w-[560px] sm:max-w-[560px]',
                        side === 'bottom' && 'h-[90dvh] w-full pb-0',
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
                >
                    <form
                        noValidate
                        onSubmit={handleSubmit}
                        className="corner-sheet-form"
                    >
                        <div className="corner-sheet-header">
                            <SheetTitle className="corner-sheet-title">
                                {isEdit ? `${list.name} settings` : 'New list'}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                Name the list and choose how its things look.
                            </SheetDescription>
                        </div>

                        {/* Block scroller, no display:flex: iOS Safari freezes a flex + overflow:auto element. */}
                        <div {...swipeHandlers} className="corner-sheet-scroll">
                            <div className="corner-sheet-body">
                                <FormField
                                    label="Name"
                                    name="name"
                                    error={errors.name}
                                >
                                    <Input
                                        id="name"
                                        type="text"
                                        autoComplete="off"
                                        maxLength={60}
                                        placeholder="Books, recipes, board games…"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        className="text-(length:--text-body)"
                                    />
                                </FormField>

                                <fieldset className="corner-fieldset">
                                    <legend className="corner-fieldset-legend">
                                        What goes in it
                                    </legend>
                                    {isEdit ? (
                                        <p className="corner-form-hint">
                                            {
                                                KINDS.find(
                                                    (k) => k.kind === data.kind,
                                                )?.description
                                            }{' '}
                                            This is fixed once a list is made.
                                        </p>
                                    ) : (
                                        <div
                                            role="radiogroup"
                                            aria-label="What goes in it"
                                            className="corner-kind-grid"
                                        >
                                            {KINDS.map((k) => (
                                                <button
                                                    key={k.kind}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={
                                                        data.kind === k.kind
                                                    }
                                                    onClick={() =>
                                                        setData('kind', k.kind)
                                                    }
                                                    className="corner-kind-option shell-press"
                                                >
                                                    <span className="corner-kind-label">
                                                        {k.label}
                                                        {data.kind ===
                                                            k.kind && (
                                                            <CheckCircle2
                                                                aria-hidden="true"
                                                                size={16}
                                                                strokeWidth={
                                                                    1.5
                                                                }
                                                            />
                                                        )}
                                                    </span>
                                                    <span className="corner-kind-description">
                                                        {k.description}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {errors.kind && (
                                        <p
                                            role="alert"
                                            className="corner-field-error"
                                        >
                                            {errors.kind}
                                        </p>
                                    )}
                                </fieldset>

                                <fieldset className="corner-fieldset">
                                    <legend className="corner-fieldset-legend">
                                        Icon
                                    </legend>
                                    <div
                                        role="radiogroup"
                                        aria-label="Icon"
                                        className="corner-icon-grid"
                                    >
                                        {Object.entries(LIST_ICONS).map(
                                            ([key, { Icon, label }]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={
                                                        data.icon === key
                                                    }
                                                    aria-label={label}
                                                    title={label}
                                                    onClick={() =>
                                                        setData('icon', key)
                                                    }
                                                    className="corner-icon-option shell-press"
                                                >
                                                    <Icon
                                                        aria-hidden="true"
                                                        size={20}
                                                        strokeWidth={1.5}
                                                    />
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </fieldset>

                                <fieldset className="corner-fieldset">
                                    <legend className="corner-fieldset-legend">
                                        When one is done, it’s…
                                    </legend>
                                    <div
                                        role="radiogroup"
                                        aria-label="Done word"
                                        className="corner-chip-row"
                                    >
                                        {DONE_WORDS.map((word) => (
                                            <button
                                                key={word}
                                                type="button"
                                                role="radio"
                                                aria-checked={
                                                    data.done_label === word
                                                }
                                                onClick={() =>
                                                    pickDoneWord(word)
                                                }
                                                className="corner-chip shell-press"
                                            >
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="corner-word-pair">
                                        <FormField
                                            label={
                                                doneIsPreset
                                                    ? 'Or your own word'
                                                    : 'Your own word'
                                            }
                                            name="done_label"
                                            error={errors.done_label}
                                        >
                                            <Input
                                                id="done_label"
                                                type="text"
                                                autoComplete="off"
                                                maxLength={24}
                                                value={data.done_label}
                                                onChange={(e) =>
                                                    setData(
                                                        'done_label',
                                                        e.target.value,
                                                    )
                                                }
                                                className="text-(length:--text-body)"
                                            />
                                        </FormField>
                                        <FormField
                                            label="The rest are"
                                            name="todo_label"
                                            error={errors.todo_label}
                                        >
                                            <Input
                                                id="todo_label"
                                                type="text"
                                                autoComplete="off"
                                                maxLength={24}
                                                value={data.todo_label}
                                                onChange={(e) =>
                                                    setData(
                                                        'todo_label',
                                                        e.target.value,
                                                    )
                                                }
                                                className="text-(length:--text-body)"
                                            />
                                        </FormField>
                                    </div>
                                </fieldset>

                                <fieldset className="corner-fieldset">
                                    <legend className="corner-fieldset-legend">
                                        Mark it with
                                    </legend>
                                    <div
                                        role="radiogroup"
                                        aria-label="Mark it with"
                                        className="corner-chip-row"
                                    >
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={
                                                data.done_icon === 'heart'
                                            }
                                            onClick={() =>
                                                setData('done_icon', 'heart')
                                            }
                                            className="corner-chip shell-press"
                                        >
                                            <HeartMark size={14} filled />A
                                            heart
                                        </button>
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={
                                                data.done_icon === 'check'
                                            }
                                            onClick={() =>
                                                setData('done_icon', 'check')
                                            }
                                            className="corner-chip shell-press"
                                        >
                                            <CheckCircle2
                                                aria-hidden="true"
                                                size={14}
                                                strokeWidth={1.5}
                                            />
                                            A tick
                                        </button>
                                    </div>
                                </fieldset>

                                <div className="corner-switch-row">
                                    <label
                                        htmlFor={`${ids}-notify`}
                                        className="corner-switch-label"
                                    >
                                        Tell everyone when something is added
                                        <span className="corner-form-hint">
                                            A notification goes to the others
                                            who have them turned on.
                                        </span>
                                    </label>
                                    <Switch
                                        id={`${ids}-notify`}
                                        checked={data.notify_on_add}
                                        onCheckedChange={(checked) =>
                                            setData('notify_on_add', checked)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="corner-sheet-footer">
                            <SubmitButton
                                processing={processing}
                                busyText={isEdit ? 'Saving…' : 'Making it…'}
                            >
                                {isEdit ? 'Save' : 'Make the list'}
                            </SubmitButton>
                        </div>
                    </form>

                    {/* Last in the DOM so opening focuses the first field, not the close. */}
                    <OverlayClose className="top-3 right-3" />
                </SheetContent>
            </Sheet>

            <DiscardDraftDialog
                {...gate.prompt}
                title="Discard your changes?"
                description="What you changed here won't be saved."
            />
        </>
    );
}
