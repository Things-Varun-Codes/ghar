import { useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { formSubmitOptions } from '@/lib/mutation';
import IconPicker from '@/MiniApps/Corner/Components/IconPicker';
import type { ListSettings } from '@/MiniApps/Corner/lib/presets';
import {
    BLANK_LIST,
    DONE_WORDS,
    TODO_FOR_DONE,
} from '@/MiniApps/Corner/lib/presets';
import type { CornerListInfo } from '@/MiniApps/Corner/lib/types';
import { store, update } from '@/routes/apps/our-corner/lists';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import HeartMark from '@/Shell/Components/HeartMark';
import SubmitButton from '@/Shell/Components/SubmitButton';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /* The list being changed; without one the sheet makes a new list. */
    list?: CornerListInfo;
};

const SHOWN_FIELDS = ['name', 'icon', 'done_label', 'todo_label'];

function settingsOf(list: CornerListInfo): ListSettings {
    return {
        name: list.name,
        icon: list.icon,
        done_label: list.done_label,
        todo_label: list.todo_label,
        done_icon: list.done_icon,
        notify_on_add: list.notify_on_add,
    };
}

/*
 * Everything a household can say about a list: what it is called, its icon, the words and
 * mark for done, and whether adding to it tells everyone.
 */
export default function ListSettingsSheet({ open, onOpenChange, list }: Props) {
    const isEdit = list !== undefined;
    const ids = useId();

    const form = useForm<ListSettings>(list ? settingsOf(list) : BLANK_LIST);
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

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
            ...formSubmitOptions({
                component: 'Corner/ListSettingsSheet',
                action: isEdit ? 'list.update' : 'list.create',
                isShownField: (key) => SHOWN_FIELDS.includes(key),
                onSuccess: () => {
                    gateReset();
                    onOpenChange(false);
                },
            }),
        };

        if (isEdit) {
            // The page's own props carry the list, so it must be re-read rather than kept.
            patch(update.url(list.id), { ...options, preserveState: false });
        } else {
            post(store.url(), options);
        }
    };

    const doneIsPreset = DONE_WORDS.includes(data.done_label);

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? `${list.name} settings` : 'New list'}
            description="Name the list, choose its icon and say what done means."
            isDirty={isDirty}
            onDiscard={() => {
                reset();
                gateReset();
            }}
            onSubmit={handleSubmit}
            footer={
                <SubmitButton
                    processing={processing}
                    busyText={isEdit ? 'Saving…' : 'Making it…'}
                >
                    {isEdit ? 'Save' : 'Make the list'}
                </SubmitButton>
            }
        >
            <FormField label="Name" name="name" error={errors.name}>
                <Input
                    id="name"
                    type="text"
                    autoComplete="off"
                    maxLength={60}
                    placeholder="Books, recipes, board games…"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="text-(length:--text-body)"
                />
            </FormField>

            <FormField label="Icon" name="icon" error={errors.icon}>
                <IconPicker
                    id="icon"
                    value={data.icon}
                    onChange={(icon) => setData('icon', icon)}
                />
            </FormField>

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
                            aria-checked={data.done_label === word}
                            onClick={() => pickDoneWord(word)}
                            className="corner-chip shell-press"
                        >
                            {word}
                        </button>
                    ))}
                </div>
                <div className="corner-word-pair">
                    <FormField
                        label={
                            doneIsPreset ? 'Or your own word' : 'Your own word'
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
                                setData('done_label', e.target.value)
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
                                setData('todo_label', e.target.value)
                            }
                            className="text-(length:--text-body)"
                        />
                    </FormField>
                </div>
            </fieldset>

            <fieldset className="corner-fieldset">
                <legend className="corner-fieldset-legend">Mark it with</legend>
                <div
                    role="radiogroup"
                    aria-label="Mark it with"
                    className="corner-chip-row"
                >
                    <button
                        type="button"
                        role="radio"
                        aria-checked={data.done_icon === 'heart'}
                        onClick={() => setData('done_icon', 'heart')}
                        className="corner-chip shell-press"
                    >
                        <HeartMark size={14} filled />A heart
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={data.done_icon === 'check'}
                        onClick={() => setData('done_icon', 'check')}
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
                        A notification goes to the others who have them turned
                        on.
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
        </FormSheet>
    );
}
