<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreateBouquet;
use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Controllers\Concerns\ListsSentAndReceived;
use App\MiniApps\Mailbox\Exceptions\BouquetSafetyException;
use App\MiniApps\Mailbox\Http\Requests\GenerateBouquetRequest;
use App\MiniApps\Mailbox\Http\Requests\StoreBouquetRequest;
use App\MiniApps\Mailbox\Http\Resources\BouquetResource;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Support\BouquetPromptBuilder;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Response;

class BouquetsController
{
    use ListsSentAndReceived;

    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        return $this->sentAndReceived(
            $request, $household, Bouquet::class, 'MiniApps/Mailbox/Pages/Flowers', 'bouquets', 'note',
            fn (Bouquet $b) => app(BouquetResource::class)($b, $viewer),
        )->with('catalog', config('mailbox-bouquets'));
    }

    /**
     * Resolved via app(), not injected, so a misconfigured provider fails this one route
     * rather than the whole controller.
     */
    public function generate(GenerateBouquetRequest $request): JsonResponse
    {
        /** @var BouquetImageGenerator $generator */
        $generator = app(BouquetImageGenerator::class);
        $validated = $request->validated();

        $catalogByKey = collect(config('mailbox-bouquets', []))->keyBy('key')->all();
        $flowerNames = collect($validated['flowers'])->map(
            fn (string $key) => isset($catalogByKey[$key]) ? $catalogByKey[$key]['name'] : $key
        )->all();

        $prompt = BouquetPromptBuilder::build($flowerNames, $validated['refine'] ?? null);

        try {
            $generated = $generator->generate($prompt);
        } catch (BouquetSafetyException $e) {
            // A safe content-policy string; the API key is never in this path.
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable) {
            return response()->json(['message' => 'Could not arrange your bouquet. Please try again.'], 500);
        }

        if ($generated->bytes === '') {
            return response()->json(['message' => 'The bouquet came out blank. Please try different flowers.'], 422);
        }

        return response()->json([
            'image' => base64_encode($generated->bytes),
            'mime' => $generated->mimeType,
        ]);
    }

    public function store(StoreBouquetRequest $request, CreateBouquet $action): RedirectResponse
    {
        $action($request, $request->user());

        FlashToast::success('Flowers sent.');

        return redirect('/apps/our-exchange/flowers?tab=sent');
    }

    public function destroy(Request $request, Bouquet $bouquet): RedirectResponse
    {
        Gate::authorize('delete', $bouquet);

        $bouquet->delete();

        FlashToast::success('Flowers deleted.');

        return redirect()->back();
    }
}
