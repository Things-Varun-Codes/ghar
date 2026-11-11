<?php

namespace App\MiniApps\Corner\Controllers;

use App\Shell\Services\LinkableEntities;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LinkablePickerController
{
    public function search(Request $request, LinkableEntities $linkable): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'types' => ['nullable', 'array'],
            'types.*' => ['string', Rule::in($linkable->registeredTypes())],
        ]);

        $results = $linkable->search(
            query: $validated['q'],
            types: $validated['types'] ?? [],
            limit: 20,
        );

        return response()->json(['results' => $results]);
    }
}
