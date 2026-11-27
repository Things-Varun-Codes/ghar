import { useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formSubmitOptions } from '@/lib/mutation';
import type { ListSettings } from '@/MiniApps/Corner/lib/presets';
import {
    BLANK_LIST,
    DONE_WORDS,
    LIST_ICONS,
    TODO_FOR_DONE,
} from '@/MiniApps/Corner/lib/presets';
import type { CornerListInfo, DoneIcon } from '@/MiniApps/Corner/lib/types';
import { store, update } from '@/routes/apps/our-shelf/lists';
import FormField from '@/Shell/Components/FormField';
import FormSheet from '@/Shell/Components/FormSheet';
import HeartMark from '@/Shell/Components/HeartMark';
import IconPicker from '@/Shell/Components/IconPicker';
import SubmitButton from '@/Shell/Components/SubmitButton';
import SwitchRow from '@/Shell/Components/SwitchRow';

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
        done_per_person: list.done_per_person,
    };
}

/*
 * A choice drawn as one of the room's chips. tailwind-merge drops the radio's round dot look;
 * .corner-chip draws the rest, and data-checked marks the chosen one.
 */
function Chip({ value, children }: { value: string; children: ReactNode }) {
    return (
        <RadioGroupItem
            value={value}
            className="corner-chip shell-press aspect-auto size-auto rounded-(--corner-radius-pill) before:hidden"
        >
            {children}
        </RadioGroupItem>
    );
}

/*
 * Everything a household can say about a list: what it is called, its icon, the words and
 * mark for done, and whether adding to it tells everyone.
 */
export default function ListSettingsSheet({ open, onOpenChange, list }: Props) {
    const isEdit = list !== undefined;

    const form = useForm<ListSettings>(list ? settingsOf(list) : BLANK_LIST);
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty } = form;

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
                    form.setDefaults();
                    onOpenChange(false);
                },
            }),
        };

        if (isEdit) {
            patch(update.url(list.id), options);
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
            onDiscard={() => reset()}
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
                    suggested={LIST_ICONS}
                    recentKey="ghar.corner.recent-icons"
                />
            </FormField>

            <fieldset className="corner-fieldset">
                <legend className="corner-fieldset-legend">
                    When one is done, it’s…
                </legend>
                <RadioGroup
                    aria-label="Done word"
                    value={data.done_label}
                    onValueChange={(word) => pickDoneWord(word as string)}
                    className="corner-chip-row"
                >
                    {DONE_WORDS.map((word) => (
                        <Chip key={word} value={word}>
                            {word}
                        </Chip>
                    ))}
                </RadioGroup>
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
                <RadioGroup
                    aria-label="Mark it with"
                    value={data.done_icon}
                    onValueChange={(icon) =>
                        setData('done_icon', icon as DoneIcon)
                    }
                    className="corner-chip-row"
                >
                    <Chip value="heart">
                        <HeartMark size={14} filled />A heart
                    </Chip>
                    <Chip value="check">
                        <CheckCircle2
                            aria-hidden="true"
                            size={14}
                            strokeWidth={1.5}
                        />
                        A tick
                    </Chip>
                </RadioGroup>
            </fieldset>

            <SwitchRow
                label="Everyone marks their own"
                description={`Each person keeps their own “${data.done_label || 'done'}”, and the list shows who has. Off, one person marks it for everyone.`}
                checked={data.done_per_person ?? false}
                onCheckedChange={(checked) =>
                    setData('done_per_person', checked)
                }
                className="corner-switch-row"
                labelClassName="corner-switch-label"
                descriptionClassName="corner-form-hint"
            />

            <SwitchRow
                label="Tell everyone when something is added"
                description="A notification goes to the others who have them turned on."
                checked={data.notify_on_add}
                onCheckedChange={(checked) => setData('notify_on_add', checked)}
                className="corner-switch-row"
                labelClassName="corner-switch-label"
                descriptionClassName="corner-form-hint"
            />
        </FormSheet>
    );
}
