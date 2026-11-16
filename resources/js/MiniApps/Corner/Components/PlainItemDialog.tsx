import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { captureSilent } from '@/lib/observability';
import type { ItemDialogProps } from '@/MiniApps/Corner/Components/ItemDialog';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { store, update } from '@/routes/apps/our-corner/items';
import FormField from '@/Shell/Components/FormField';

type FormShape = { title: string; notes: string };

export default function PlainItemDialog({
    list,
    open,
    onOpenChange,
    item,
}: ItemDialogProps) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>({
        title: item?.title ?? '',
        notes: item?.notes ?? '',
    });
    const { data, setData, post, patch, processing, errors, reset } = form;
    const { isDirty, reset: gateReset } = useDirtyFormGate(form);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                gateReset();
                onOpenChange(false);
            },
            onError: (errs: Record<string, string>) => {
                captureSilent(new Error('corner.item-add submit failed'), {
                    component: 'Corner/PlainItemDialog',
                    action: isEdit ? 'item.update' : 'item.create',
                    surface: 'frontend',
                    extra: {
                        tag: 'corner.item-add',
                        validation_keys: Object.keys(errs ?? {}),
                    },
                });
            },
        };

        if (isEdit) {
            // An edit doesn't move the list's reset key, so force a remount or the row stays stale.
            patch(update.url(item.id), {
                ...options,
                preserveState: false,
            });
        } else {
            post(store.url(list.slug), options);
        }
    };

    return (
        <ListAddDialog
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit' : `Add to ${list.name}`}
            submitLabel={isEdit ? 'Save changes' : 'Add'}
            busyText={isEdit ? 'Saving…' : 'Adding…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={isDirty}
            renderFields={() => (
                <>
                    <FormField label="Name" name="title" error={errors.title}>
                        <Input
                            id="title"
                            type="text"
                            autoComplete="off"
                            maxLength={255}
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="text-(length:--text-body)"
                        />
                    </FormField>

                    <NotesField
                        value={data.notes}
                        onChange={(v) => setData('notes', v)}
                        error={errors.notes}
                    />
                </>
            )}
        />
    );
}
