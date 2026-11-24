<?php

use App\MiniApps\Corner\Support\LinkKey;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An item's place is its link now: a map link opens the place. Before the place columns go,
 * what they held moves to where a person can still see it. A map link with no other link
 * becomes the link; coordinates with no link become a map link to them; anything else (a
 * second link, a typed place name, an address) is added to the notes.
 */
return new class extends Migration
{
    private const PLACE_COLUMNS = ['location_label', 'location_url', 'place_id', 'lat', 'lng', 'address'];

    private const NOTES_MAX = 2000;

    public function up(): void
    {
        // Keys already taken in each list, so a moved link never collides with one already there.
        $taken = [];
        DB::table('corner_items')->whereNotNull('url_key')->get(['list_id', 'url_key'])
            ->each(function (object $row) use (&$taken): void {
                $taken[$row->list_id][$row->url_key] = true;
            });

        DB::table('corner_items')
            ->where(fn ($query) => $query->whereNotNull('location_label')->orWhereNotNull('location_url')
                ->orWhereNotNull('lat')->orWhereNotNull('address'))
            ->orderBy('id')
            ->get(['id', 'list_id', 'title', 'notes', 'url', 'location_label', 'location_url', 'lat', 'lng', 'address'])
            ->each(function (object $row) use (&$taken): void {
                $changes = [];
                $extra = [];
                // The pin: the map link it was read from, else a map link to its coordinates.
                $pin = $row->location_url ?? ($row->lat !== null && $row->lng !== null
                    ? 'https://www.google.com/maps/search/?api=1&query='.(float) $row->lat.','.(float) $row->lng
                    : null);

                // A geo: address isn't a web link, so it can only be kept as text.
                if ($row->url === null && $pin !== null && preg_match('#^https?://#i', $pin) === 1) {
                    $changes['url'] = $pin;
                } elseif ($pin !== null && $pin !== $row->url) {
                    $extra[] = $pin;
                }

                if (isset($changes['url'])) {
                    // LinkKey as it is today: a fresh install has no places for this to move.
                    $columns = LinkKey::columnsFor($changes['url']);
                    $key = $columns['url_key'];
                    $changes['url_key'] = $key !== null && ! isset($taken[$row->list_id][$key]) ? $key : null;
                    $changes['site_name'] = $columns['site_name'];
                    if ($changes['url_key'] !== null) {
                        $taken[$row->list_id][$key] = true;
                    }
                }

                $label = trim((string) $row->location_label);
                if ($label !== '' && mb_strtolower($label) !== mb_strtolower(trim($row->title))) {
                    $extra[] = $label;
                }

                $address = trim((string) $row->address);
                if ($address !== '' && mb_strtolower($address) !== mb_strtolower($label)) {
                    $extra[] = $address;
                }

                if ($extra !== []) {
                    $notes = trim(implode("\n\n", array_filter([trim((string) $row->notes), implode("\n", $extra)])));
                    // Notes are validated at this length, so a longer one could never be saved again.
                    $changes['notes'] = mb_substr($notes, 0, self::NOTES_MAX);
                }

                if ($changes !== []) {
                    DB::table('corner_items')->where('id', $row->id)->update($changes);
                }
            });

        Schema::table('corner_items', function (Blueprint $table) {
            $table->dropColumn(self::PLACE_COLUMNS);
        });
    }

    /** The columns come back empty: what moved into links and notes stays there. */
    public function down(): void
    {
        Schema::table('corner_items', function (Blueprint $table) {
            $table->string('location_label')->nullable();
            $table->string('location_url', 2048)->nullable();
            $table->string('place_id')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address', 1024)->nullable();
        });
    }
};
