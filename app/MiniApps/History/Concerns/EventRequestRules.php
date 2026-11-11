<?php

namespace App\MiniApps\History\Concerns;

trait EventRequestRules
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'occurred_on' => $this->isUpdate()
                ? ['sometimes', 'required', 'date']
                : ['required', 'date'],
            'title' => ['nullable', 'string', 'max:200'],
            'location_freetext' => ['nullable', 'string', 'max:200'],
            'location_place_id' => ['nullable', 'string', 'max:255'],
            'location_name' => ['nullable', 'string', 'max:255'],
            'location_address' => ['nullable', 'string', 'max:255'],
            'location_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'location_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'body_html' => ['nullable', 'string', 'max:50000'],
        ];
    }

    protected function isUpdate(): bool
    {
        return false;
    }
}
