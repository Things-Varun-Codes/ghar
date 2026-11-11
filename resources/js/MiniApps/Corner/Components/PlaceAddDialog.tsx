import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { useDirtyFormGate } from '@/hooks/use-dirty-form-gate';
import { captureSilent } from '@/lib/observability';
import ListAddDialog from '@/MiniApps/Corner/Components/ListAddDialog';
import { store, update } from '@/routes/apps/our-corner/places';
import FormField from '@/Shell/Components/FormField';
import PlacesLocationField, {
    useHasPlacesSearch,
} from '@/Shell/Components/PlacesLocationField';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: {
        id: number;
        title: string;
        place_id: string | null;
        lat: number | null;
        lng: number | null;
        address: string | null;
    };
};

type FormShape = {
    title: string;
    place_id: string;
    lat: number | null;
    lng: number | null;
    address: string;
};

const emptyForm: FormShape = {
    title: '',
    place_id: '',
    lat: null,
    lng: null,
    address: '',
};

export default function PlaceAddDialog({ open, onOpenChange, item }: Props) {
    const isEdit = item !== undefined;

    const form = useForm<FormShape>(
        item
            ? {
                  title: item.title,
                  place_id: item.place_id ?? '',
                  lat: item.lat,
                  lng: item.lng,
                  address: item.address ?? '',
              }
            : emptyForm,
    );
    const { data, setData, post, patch, processing, errors, reset } = form;
    const hasPlacesSearch = useHasPlacesSearch();
    const { isDirty, reset: gateReset } = useDirtyFormGate(form, {
        fields: hasPlacesSearch ? ['place_id'] : ['title', 'address'],
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
                    component: 'Corner/PlaceAddDialog',
                    action: isEdit ? 'place.update' : 'place.create',
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
            post(store.url(), options);
        }
    };

    return (
        <ListAddDialog
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? 'Edit place' : 'Add a place'}
            submitLabel={isEdit ? 'Save changes' : 'Add place'}
            busyText={isEdit ? 'Saving…' : 'Adding place…'}
            processing={processing}
            onSubmit={handleSubmit}
            isDirty={() => isDirty}
            renderFields={() =>
                hasPlacesSearch ? (
                    <div className="flex flex-col gap-1.5">
                        <FormField label="Where?" name="place-search">
                            <PlacesLocationField
                                onSelect={(loc) => {
                                    if (loc === null) {
                                        setData(emptyForm);

                                        return;
                                    }

                                    setData({
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
                            <p className="mx-0 mt-1 mb-0 text-[12px] text-(--corner-ink-soft)">
                                Search and pick a place to enable the
                                {isEdit ? ' Save changes' : ' Add'} button.
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
                                className="text-[16px]"
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
                                className="text-[16px]"
                            />
                        </FormField>
                    </>
                )
            }
        />
    );
}
