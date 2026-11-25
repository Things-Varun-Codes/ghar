<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreatePostcard;
use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\Controllers\Concerns\ListsSentAndReceived;
use App\MiniApps\Mailbox\Exceptions\ImageSafetyException;
use App\MiniApps\Mailbox\Http\Requests\GeneratePostcardRequest;
use App\MiniApps\Mailbox\Http\Requests\StorePostcardRequest;
use App\MiniApps\Mailbox\Http\Resources\PostcardResource;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Models\SavedPrompt;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Response;

class PostcardsController
{
    use ListsSentAndReceived;

    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        return $this->sentAndReceived(
            $request, $household, Postcard::class, 'MiniApps/Mailbox/Pages/Postcards', 'postcards', 'note',
            fn (Postcard $b) => app(PostcardResource::class)($b, $viewer),
        )->with([
            'presets' => config('mailbox-postcards'),
            'savedPrompts' => SavedPrompt::query()->where('user_id', $viewer->id)->orderBy('name')->get(['id', 'name', 'prompt']),
        ]);
    }

    public function fromFlowers(Request $request): RedirectResponse
    {
        return redirect()->route('apps.our-exchange.postcards.index', $request->query());
    }

    /**
     * Resolved via app(), not injected, so a misconfigured provider fails this one route
     * rather than the whole controller.
     */
    public function generate(GeneratePostcardRequest $request): JsonResponse
    {
        /** @var ImageGenerator $generator */
        $generator = app(ImageGenerator::class);
        try {
            $generated = $generator->generate($request->validated('prompt'));
        } catch (ImageSafetyException $e) {
            // A safe content-policy string; the API key is never in this path.
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable) {
            return response()->json(['message' => 'Could not make your picture. Please try again.'], 500);
        }

        if ($generated->bytes === '') {
            return response()->json(['message' => 'The picture came out blank. Please try a different prompt.'], 422);
        }

        return response()->json([
            'image' => base64_encode($generated->bytes),
            'mime' => $generated->mimeType,
        ]);
    }

    public function store(StorePostcardRequest $request, CreatePostcard $action): RedirectResponse
    {
        $action($request, $request->user());

        FlashToast::success('Postcard sent.');

        return redirect('/apps/our-exchange/postcards?tab=sent');
    }

    public function destroy(Request $request, Postcard $postcard): RedirectResponse
    {
        Gate::authorize('delete', $postcard);

        $postcard->delete();

        FlashToast::success('Postcard deleted.');

        return redirect()->back();
    }
}
