import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { captureSilent } from '@/lib/observability';
import type { ItemDialogProps } from '@/MiniApps/Corner/Components/ItemDialog';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import NotesField from '@/MiniApps/Corner/Components/NotesField';
import { store, update } from '@/routes/apps/our-corner/items';
import FormField from '@/Shell/Components/FormField';
import PlacesLocationField, {
    useHasPlacesSearch,
} from '@/Shell/Components/PlacesLocationField';

type FormShape = {
    title: string;
    place_id: string;
    lat: number | null;
    lng: number | null;
    address: string;
    notes: string;
};

const emptyForm: FormShape = {
    title: '',
    place_id: '',
    lat: null,
    lng: null,
    address: '',
    notes: '',
};

export default function PlaceItemDialog({
    list,
    open,
    onOpenChange,
    item,
}: ItemDialogProps) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>(
        item
            ? {
                  title: item.title,
                  place_id: item.place_id ?? '',
                  lat: item.lat,
                  lng: item.lng,
                  address: item.address ?? '',
                  notes: item.notes ?? '',
              }
            : emptyForm,
    );
    const { data, setData, post, patch, processing, errors, reset } = form;
    const hasPlacesSearch = useHasPlacesSearch();
    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: hasPlacesSearch
            ? ['place_id', 'notes']
            : ['title', 'address', 'notes'],
    });

    // With search, a place counts once it's picked; typed in, a name is enough.
    const hasPick = hasPlacesSearch
        ? data.place_id.length > 0
        : data.title.trim().length > 0;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!hasPick) {
            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                gateReset();
                onOpenChange(false);
            },
            onError: (errs: Record<string, string>) => {
                captureSilent(new Error('corner.place-add submit failed'), {
                    component: 'Corner/PlaceItemDialog',
                    action: isEdit ? 'item.update' : 'item.create',
                    surface: 'frontend',
                    extra: {
                        tag: 'corner.place-add',
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
                    {hasPlacesSearch ? (
                        <div className="flex flex-col gap-1">
                            <FormField label="Where?" name="place-search">
                                <PlacesLocationField
                                    onSelect={(loc) => {
                                        if (loc === null) {
                                            setData({
                                                ...emptyForm,
                                                notes: data.notes,
                                            });

                                            return;
                                        }

                                        setData({
                                            ...data,
                                            title: loc.name,
                                            place_id: loc.place_id,
                                            lat: loc.lat,
                                            lng: loc.lng,
                                            address: loc.address,
                                        });
                                    }}
                                    value={
                                        hasPick
                                            ? {
                                                  name: data.title,
                                                  address: data.address,
                                              }
                                            : null
                                    }
                                />
                            </FormField>
                            {!hasPick && (
                                <p className="corner-form-hint">
                                    Pick a place from the search results to
                                    {isEdit ? ' save your changes' : ' add it'}.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <FormField
                                label="Where?"
                                name="title"
                                error={errors.title}
                            >
                                <Input
                                    id="title"
                                    type="text"
                                    placeholder="e.g. The bakery on 4th Cross"
                                    autoComplete="off"
                                    maxLength={255}
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    className="text-(length:--text-body)"
                                />
                            </FormField>
                            <FormField
                                label="Address (optional)"
                                name="address"
                                error={errors.address}
                            >
                                <Input
                                    id="address"
                                    type="text"
                                    autoComplete="off"
                                    maxLength={1024}
                                    value={data.address}
                                    onChange={(e) =>
                                        setData('address', e.target.value)
                                    }
                                    className="text-(length:--text-body)"
                                />
                            </FormField>
                        </>
                    )}

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
