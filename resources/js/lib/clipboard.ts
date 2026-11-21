import { toast } from 'sonner';

export async function copyLink(url: string): Promise<void> {
    if (!navigator.clipboard) {
        toast.error(
            "This browser can't copy from here. Copy the link by hand.",
        );

        return;
    }

    try {
        await navigator.clipboard.writeText(url);
        toast.success('Copied.');
        // eslint-disable-next-line local/no-silent-error -- clipboard write failure surfaces via the toast below; not actionable in the error tracker
    } catch {
        toast.error("Couldn't copy the link. Try again.");
    }
}
