<?php

namespace App\Shell\Controllers\Settings;

use App\Shell\Actions\ProfilePicture;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class ProfilePictureController
{
    public function update(Request $request, ProfilePicture $pictures): RedirectResponse
    {
        $validated = $request->validate(
            [
                'picture' => [
                    'required',
                    'file',
                    // No SVG: it can carry script.
                    'mimes:'.implode(',', ProfilePicture::EXTENSIONS),
                    'max:'.ProfilePicture::MAX_KILOBYTES,
                    'dimensions:min_width=64,min_height=64,max_width=10000,max_height=10000',
                ],
            ],
            [
                'picture.required' => 'Choose a picture.',
                'picture.file' => "That doesn't look like a picture.",
                'picture.mimes' => 'Use a JPEG, PNG or WebP picture.',
                'picture.max' => "That picture's too big. Keep it under 10 MB.",
                'picture.dimensions' => 'Use a picture at least 64 pixels across.',
            ],
        );

        /** @var UploadedFile $upload */
        $upload = $validated['picture'];

        $pictures->replace($request->user(), $upload);

        FlashToast::success('Picture saved.');

        return redirect()->route('settings.profile.show');
    }

    public function destroy(Request $request, ProfilePicture $pictures): RedirectResponse
    {
        $pictures->remove($request->user());

        FlashToast::success('Picture removed.');

        return redirect()->route('settings.profile.show');
    }
}
