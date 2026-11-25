<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\StorePostcardRequest;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreatePostcard
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    public function __invoke(StorePostcardRequest $request, User $sender): Postcard
    {
        $validated = $request->validated();

        ['bytes' => $bytes, 'mime' => $mime] = StorePostcardRequest::decodeImage($validated['image']);
        $ext = StorePostcardRequest::MIME_EXTENSION_MAP[$mime];

        $uuid = (string) Str::uuid();
        $objectKey = "postcards/{$uuid}.{$ext}";

        // Raw bytes, no re-encode. Writing before the transaction can orphan an object if the
        // insert fails; accepted.
        Storage::disk(config('services.image_ai.disk'))->put($objectKey, $bytes);

        $recipientIds = $request->recipientIds();

        /** @var Postcard $postcard */
        $postcard = DB::transaction(function () use ($validated, $sender, $recipientIds, $objectKey): Postcard {
            $postcard = Postcard::create([
                'sender_id' => $sender->id,
                'image_key' => $objectKey,
                'prompt' => $validated['prompt'],
                'note' => $validated['note'] ?? null,
                'posted_at' => now(),
            ]);
            $postcard->recipients()->attach($recipientIds);

            return $postcard;
        });

        $firstName = $sender->firstName();

        $this->push->toListAt(
            $postcard->recipients()->get(),
            EntryTypes::POSTCARDS,
            $postcard->id,
            "You got a postcard from {$firstName}",
        );

        return $postcard;
    }
}
