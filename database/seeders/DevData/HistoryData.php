<?php

namespace Database\Seeders\DevData;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;

/**
 * History moments by different creators: more than one timeline page and one
 * gallery page, across several years, with photos, locations and Corner links.
 */
final class HistoryData
{
    /**
     * @param  array<string, array{id: int, title: string, type: string, slug: string}>  $links
     */
    public function seed(Household $h, array $links): void
    {
        // [title, creator, days ago, location, photos, body]
        $moments = [
            ['Diwali on the terrace', $h->ravi, 1, 'Home', 3, '<p>Everyone on the terrace, nobody watching the rockets.</p>'],
            ['Kabir\'s science fair', $h->kabir, 6, 'School hall', 2, null],
            ['Meera\'s first pottery class', $h->meera, 12, 'Clay Studio, Indiranagar', 2, '<p>The bowl leans. The bowl is <em>perfect</em>.</p>'],
            ['Sunday at the lake', $h->admin, 25, null, 1, null],
            ['Monsoon drive to the coast', $h->ravi, 40, 'Coastal highway', 3, null],
            [null, $h->kabir, 52, null, 1, null],
            ['Grandma\'s 80th', $h->admin, 75, 'Community hall', 2, '<h2>Eighty</h2><p>She out-danced <strong>all</strong> of us.</p>'],
            ['New bookshelf, finally', $h->meera, 95, 'Home', 1, null],
            ['First day of college', $h->kabir, 130, null, 1, null],
            ['Holi in the courtyard', $h->ravi, 240, 'Home', 2, null],
            ['Trek to the waterfall', $h->meera, 300, 'Western Ghats', 1, null],
            ['Moving day', $h->admin, 370, null, 1, null],
            ['Eid at the neighbours\'', $h->ravi, 420, null, 0, null],
            ['Power cut board games', $h->kabir, 470, 'Home', 1, null],
            ['Ravi burns the pancakes', $h->meera, 530, 'Kitchen', 1, null],
            ['Road trip to Hampi', $h->admin, 610, 'Hampi', 1, null],
            ['School concert', $h->meera, 700, null, 0, null],
            ['The great fridge cleanout', $h->ravi, 760, null, 0, null],
            ['Kabir\'s first bike', $h->admin, 830, 'The park', 1, null],
            ['Onam lunch', $h->meera, 900, null, 0, null],
            ['Rained in at the cabin', $h->ravi, 980, null, 0, null],
            ['Terrace garden begins', $h->admin, 1050, null, 0, null],
            ['Train to Goa', $h->kabir, 1120, null, 0, null],
            ['The day we got the keys', $h->admin, 1180, null, 1, '<p>An empty flat and one borrowed chair.</p>'],
        ];

        $photo = 0;
        $events = [];

        foreach ($moments as $i => [$title, $creator, $days, $location, $photos, $body]) {
            $event = $this->moment($h, $title, $creator, $days, $location, $body);
            $events[$i] = $event;

            for ($n = 0; $n < $photos; $n++) {
                $this->attachPhoto($event, $title ?? 'A moment', $photo++);
            }
        }

        $this->addStructuredLocation($events[3]);
        $this->linkToCorner($h, $events[0], $links);
        $this->recordEditByAdmin($h, $events[4]);
        $this->softDeleted($h);
    }

    private function moment(Household $h, ?string $title, User $creator, int $days, ?string $location, ?string $body): Event
    {
        $when = $h->daysAgo($days);

        $event = new Event([
            'occurred_on' => $when->toDateString(),
            'title' => $title,
            'location_freetext' => $location,
            'body_html' => $body,
            'creator_id' => $creator->id,
        ]);
        $event->created_at = $when;
        $event->updated_at = $when;
        $event->save();

        EventChange::create([
            'event_id' => $event->id,
            'user_id' => $creator->id,
            'action' => 'create',
            'summary' => 'Event created',
            'changes' => null,
            'created_at' => $when,
        ]);

        return $event;
    }

    private function attachPhoto(Event $event, string $label, int $index): void
    {
        [$width, $height] = $index % 3 === 2 ? [640, 960] : [960, 640];

        $path = tempnam(sys_get_temp_dir(), 'ghar-seed');
        file_put_contents($path, PlaceholderImage::jpeg($label, $index, $width, $height));

        $event->addMedia($path)
            ->usingFileName("moment-{$index}.jpg")
            ->withCustomProperties(['width' => $width, 'height' => $height])
            ->toMediaCollection('photos');
    }

    private function addStructuredLocation(Event $event): void
    {
        $event->update([
            'location_place_id' => 'dev-place-lake',
            'location_name' => 'Ulsoor Lake',
            'location_address' => 'Ulsoor, Bengaluru',
            'location_lat' => 12.9830,
            'location_lng' => 77.6190,
        ]);
    }

    /**
     * @param  array<string, array{id: int, title: string, type: string, slug: string}>  $links
     */
    private function linkToCorner(Household $h, Event $event, array $links): void
    {
        $picked = array_intersect_key($links, array_flip(['song', 'movie', 'place']));

        if ($picked === []) {
            return;
        }

        $pills = implode(', ', array_map(fn (array $link): string => sprintf(
            '<span data-corner-type="%s" data-corner-id="%d" data-corner-title="%s" data-corner-href="/apps/our-corner/%s/%d">%s</span>',
            $link['type'],
            $link['id'],
            e($link['title']),
            $link['slug'],
            $link['id'],
            e($link['title']),
        ), $picked));

        $event->update(['body_html' => $event->body_html."<p>On the list that night: {$pills}.</p>"]);

        $registry = app(LinkableEntities::class);

        foreach ($picked as $link) {
            $registry->recordReference('history.event', $event->id, $link['type'], $link['id']);
        }
    }

    private function recordEditByAdmin(Household $h, Event $event): void
    {
        EventChange::create([
            'event_id' => $event->id,
            'user_id' => $h->admin->id,
            'action' => 'edit',
            'summary' => 'Changed the location',
            'changes' => null,
            'created_at' => $h->daysAgo(38),
        ]);
    }

    private function softDeleted(Household $h): void
    {
        $this->moment($h, 'Deleted by mistake', $h->ravi, 200, null, null)->delete();
    }
}
