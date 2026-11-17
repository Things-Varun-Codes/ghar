<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\StoreBouquetRequest;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreateBouquet
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    public function __invoke(StoreBouquetRequest $request, User $sender): Bouquet
    {
        $validated = $request->validated();

        ['bytes' => $bytes, 'mime' => $mime] = StoreBouquetRequest::decodeImage($validated['image']);
        $ext = StoreBouquetRequest::MIME_EXTENSION_MAP[$mime];

        $uuid = (string) Str::uuid();
        $objectKey = "bouquets/{$uuid}.{$ext}";

        // Raw bytes, no re-encode. Writing before the transaction can orphan an object if the
        // insert fails; accepted.
        Storage::disk(config('services.bouquet.disk'))->put($objectKey, $bytes);

        $recipientIds = $request->recipientIds();

        $catalogByKey = collect(config('mailbox-bouquets', []))->keyBy('key')->all();
        $flowers = collect($validated['flowers'])->map(function (string $key) use ($catalogByKey): array {
            $entry = $catalogByKey[$key] ?? ['key' => $key, 'name' => $key, 'meaning' => ''];

            return [
                'key' => $entry['key'],
                'name' => $entry['name'],
                'meaning' => $entry['meaning'],
            ];
        })->values()->all();

        /** @var Bouquet $bouquet */
        $bouquet = DB::transaction(function () use ($validated, $sender, $recipientIds, $objectKey, $flowers): Bouquet {
            $bouquet = Bouquet::create([
                'sender_id' => $sender->id,
                'image_key' => $objectKey,
                'flowers' => $flowers,
                'note' => $validated['note'] ?? null,
                'posted_at' => now(),
            ]);
            $bouquet->recipients()->attach($recipientIds);

            return $bouquet;
        });

        $firstName = $sender->firstName();

        $this->push->toListAt(
            $bouquet->recipients()->get(),
            EntryTypes::FLOWERS,
            $bouquet->id,
            "You got a bouquet from {$firstName}",
        );

        return $bouquet;
    }
}
