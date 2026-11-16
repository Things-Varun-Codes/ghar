<?php

namespace App\MiniApps\Corner\Http\Requests;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Support\ListIcon;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Creating and editing a list. */
class SaveListRequest extends FormRequest
{
    public function authorize(): bool
    {
        $list = $this->route('list');

        return $list instanceof CornerList
            ? $this->user()->can('update', $list)
            : $this->user()->can('create', CornerList::class);
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'done_label', 'todo_label'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim(preg_replace('/\s+/u', ' ', $this->input($field)))]);
            }
        }

        if (is_string($this->input('icon'))) {
            $this->merge(['icon' => ListIcon::normalise($this->input('icon'))]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60'],
            'icon' => ['required', 'string', 'max:64', function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || ! ListIcon::isValid($value)) {
                    $fail('Choose one of the icons.');
                }
            }],
            'done_label' => ['required', 'string', 'max:24'],
            'todo_label' => ['required', 'string', 'max:24'],
            'done_icon' => ['required', Rule::in(['check', 'heart'])],
            'notify_on_add' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Give the list a name.',
            'name.max' => 'List names are limited to 60 characters.',
            'done_label.required' => 'Say what a finished one is called.',
            'done_label.max' => 'Keep it to 24 characters.',
            'todo_label.required' => "Say what the ones you haven't got to are called.",
            'todo_label.max' => 'Keep it to 24 characters.',
        ];
    }
}
