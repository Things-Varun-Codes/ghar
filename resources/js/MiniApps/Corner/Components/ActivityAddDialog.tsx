import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { captureSilent } from '@/lib/observability';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import { store, update } from '@/routes/apps/our-corner/activities';
import FormField from '@/Shell/Components/FormField';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: { id: number; title: string; notes: string | null };
};

type FormShape = { title: string; notes: string };

export default function ActivityAddDialog({ open, onOpenChange, item }: Props) {
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
                captureSilent(new Error('corner.activity-add submit failed'), {
                    component: 'Corner/ActivityAddDialog',
                    action: isEdit ? 'activity.update' : 'activity.create',
                    surface: 'frontend',
                    extra: {
                        tag: 'corner.activity-add',
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
            post(store.url(), options);
        }
    };

    return (
        <ListAddDialog
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit activity' : 'Add an activity'}
            submitLabel={isEdit ? 'Save changes' : 'Add activity'}
            busyText={isEdit ? 'Saving…' : 'Adding activity…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={() => isDirty}
            renderFields={() => (
                <>
                    <FormField
                        label="Activity"
                        name="title"
                        error={errors.title}
                    >
                        <Input
                            id="title"
                            type="text"
                            placeholder="e.g. Beach trip"
                            autoComplete="off"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="text-[16px]"
                        />
                    </FormField>

                    <FormField
                        label="Notes (optional)"
                        name="notes"
                        error={errors.notes}
                    >
                        <Textarea
                            id="notes"
                            rows={4}
                            placeholder=""
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="text-[16px]"
                        />
                    </FormField>
                </>
            )}
        />
    );
}
