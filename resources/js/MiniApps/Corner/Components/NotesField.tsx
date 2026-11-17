import { Textarea } from '@/components/ui/textarea';
import FormField from '@/Shell/Components/FormField';

/* Every kind of item can carry notes. */
export default function NotesField({
    value,
    onChange,
    error,
}: {
    value: string;
    onChange: (next: string) => void;
    error?: string;
}) {
    return (
        <FormField label="Notes (optional)" name="notes" error={error}>
            <Textarea
                id="notes"
                rows={3}
                maxLength={2000}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-(length:--text-body)"
            />
        </FormField>
    );
}
