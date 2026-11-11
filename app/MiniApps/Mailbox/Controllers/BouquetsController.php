<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\CreateBouquet;
use App\MiniApps\Mailbox\Actions\MarkBouquetsRead;
use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Exceptions\BouquetSafetyException;
use App\MiniApps\Mailbox\Http\Requests\GenerateBouquetRequest;
use App\MiniApps\Mailbox\Http\Requests\StoreBouquetRequest;
use App\MiniApps\Mailbox\Http\Resources\BouquetResource;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Support\BouquetPromptBuilder;
use App\Shell\Services\Household;
use App\Shell\Support\CursorList;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BouquetsController
{
    use ResolvesListSort;

    /** @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>> */
    protected function sortOptions(): array
    {
        return [
            'recent' => [['posted_at', 'desc'], ['id', 'desc']],
            'oldest' => [['posted_at', 'asc'], ['id', 'asc']],
        ];
    }

    public function index(Request $request, MarkBouquetsRead $markRead, Household $household): Response
    {
        $viewer = $request->user();
        $tab = $request->query('tab') === 'sent' ? 'sent' : 'received';

        if ($tab === 'received') {
            $markRead($viewer);
        }

        $base = Bouquet::query()
            ->with(['sender', 'recipients']);

        if ($tab === 'received') {
            $base->receivedBy($viewer);
        } else {
            $base->where('sender_id', $viewer->id);
        }

        $sort = $this->resolveSort($request);
        $this->applyListOrder($base, $sort);
        $q = trim((string) $request->query('q')) ?: null;

        return Inertia::render('MiniApps/Mailbox/Pages/Flowers', [
            'bouquets' => CursorList::make($base)
                ->searchable(['note'], $q)
                ->paginate('all', 50, fn (Bouquet $b) => app(BouquetResource::class)($b, $viewer)),
            'tab' => $tab,
            'sort' => $sort,
            'q' => $q,
            'members' => $household->optionsFor($viewer),
            'catalog' => config('mailbox-bouquets'),
        ]);
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
            return response()->json(['message' => 'Bouquet generation failed. Please try again.'], 500);
        }

        if ($generated->bytes === '') {
            return response()->json(['message' => 'No image was returned. Please try different flowers.'], 422);
        }

        return response()->json([
            'image' => base64_encode($generated->bytes),
            'mime' => $generated->mimeType,
        ]);
    }

    public function store(StoreBouquetRequest $request, CreateBouquet $action): RedirectResponse
    {
        $action($request, $request->user());

        return redirect('/apps/our-mailbox/flowers');
    }

    public function destroy(Request $request, Bouquet $bouquet): RedirectResponse
    {
        Gate::authorize('delete', $bouquet);

        $bouquet->delete();

        return redirect()->back();
    }
}
