<?php

namespace App\MiniApps\History\Console;

use App\MiniApps\History\Models\Event;
use Illuminate\Console\Command;

class PruneOrphanedMedia extends Command
{
    protected $signature = 'history:prune-media
                            {--days=30 : Delete media for events soft-deleted longer than this many days}
                            {--dry-run : Report what would be deleted without acting}';

    protected $description = 'Sweep stored files and Media rows for History events soft-deleted longer than the retention window.';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subDays($days);

        $events = Event::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->with('media')
            ->get();

        $eventCount = $events->count();
        $mediaCount = 0;

        if ($eventCount === 0) {
            $this->info('Nothing to prune.');

            return Command::SUCCESS;
        }

        foreach ($events as $event) {
            $eventMediaCount = $event->media->count();
            $mediaCount += $eventMediaCount;

            if ($dryRun) {
                $this->line(sprintf(
                    '[dry-run] Would prune event #%d ("%s", deleted %s) with %d media item(s).',
                    $event->id,
                    $event->title ?? '(no title)',
                    $event->deleted_at?->toDateString() ?? 'unknown',
                    $eventMediaCount,
                ));

                continue;
            }

            foreach ($event->media as $media) {
                $media->delete();
            }

            $event->forceDelete();
        }

        if ($dryRun) {
            $this->info(sprintf(
                '[dry-run] Would prune %d event(s) and %d media item(s). Run without --dry-run to act.',
                $eventCount,
                $mediaCount,
            ));
        } else {
            $this->info(sprintf(
                'Pruned %d event(s) and %d media item(s).',
                $eventCount,
                $mediaCount,
            ));
        }

        return Command::SUCCESS;
    }
}
