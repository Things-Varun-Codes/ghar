<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\SavedPrompt;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedPromptsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_saved_prompt_is_listed_for_its_owner_only_beside_the_presets(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)
            ->post('/apps/our-exchange/postcards/prompts', ['name' => 'Our street', 'prompt' => 'Our street after rain.'])
            ->assertRedirect();

        $this->get('/apps/our-exchange/postcards')->assertInertia(fn ($page) => $page
            ->has('presets', count(config('mailbox-postcards')))
            ->has('savedPrompts', 1)
            ->where('savedPrompts.0.name', 'Our street')
            ->where('savedPrompts.0.prompt', 'Our street after rain.'));

        $this->actingAs($other)->get('/apps/our-exchange/postcards')
            ->assertInertia(fn ($page) => $page->has('savedPrompts', 0));
    }

    public function test_only_the_owner_can_remove_a_saved_prompt(): void
    {
        $owner = User::factory()->create();
        $prompt = SavedPrompt::create(['user_id' => $owner->id, 'name' => 'Mine', 'prompt' => 'A fox.']);

        $this->actingAs(User::factory()->create())
            ->delete("/apps/our-exchange/postcards/prompts/{$prompt->id}")
            ->assertNotFound();
        $this->assertModelExists($prompt);

        $this->actingAs($owner)->delete("/apps/our-exchange/postcards/prompts/{$prompt->id}")->assertRedirect();
        $this->assertModelMissing($prompt);
    }

    public function test_a_prompt_needs_a_name_and_text_within_the_limit(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/apps/our-exchange/postcards/prompts', ['name' => '', 'prompt' => str_repeat('a', 1001)])
            ->assertSessionHasErrors(['name', 'prompt']);

        $this->postJson('/apps/our-exchange/postcards/generate', ['prompt' => ''])->assertJsonValidationErrors('prompt');
    }
}
