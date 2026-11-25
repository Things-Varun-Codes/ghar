<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Http\Requests\GeneratePostcardRequest;
use App\MiniApps\Mailbox\Models\SavedPrompt;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** A person's own prompts: every query starts from the signed-in user, so nobody reaches another's. */
class SavedPromptsController
{
    private const LIMIT = 30;

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(
            ['name' => ['required', 'string', 'max:40'], 'prompt' => GeneratePostcardRequest::PROMPT_RULES],
            ['name.required' => 'Give the prompt a name.', ...GeneratePostcardRequest::PROMPT_MESSAGES],
        );

        if (SavedPrompt::query()->where('user_id', $request->user()->id)->count() >= self::LIMIT) {
            throw ValidationException::withMessages(['name' => 'You have '.self::LIMIT.' saved prompts. Remove one first.']);
        }

        SavedPrompt::create([...$validated, 'user_id' => $request->user()->id]);
        FlashToast::success('Prompt saved.');

        return redirect()->back();
    }

    public function destroy(Request $request, int $prompt): RedirectResponse
    {
        SavedPrompt::query()->where('user_id', $request->user()->id)->findOrFail($prompt)->delete();
        FlashToast::success('Prompt removed.');

        return redirect()->back();
    }
}
