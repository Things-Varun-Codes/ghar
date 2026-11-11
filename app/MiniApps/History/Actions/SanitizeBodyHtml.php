<?php

namespace App\MiniApps\History\Actions;

use HTMLPurifier;
use HTMLPurifier_Config;
use Illuminate\Support\Facades\File;

/**
 * The trust boundary for TipTap's HTML: it arrives straight from the request, and the
 * editor's own cleanup is a nicety, not a defence.
 */
class SanitizeBodyHtml
{
    /**
     * HTMLPurifier finalizes its config the first time a definition is requested, so it can
     * only be built once.
     */
    private static ?HTMLPurifier $purifier = null;

    public function __invoke(string $html): string
    {
        return $this->purifier()->purify($html);
    }

    private function purifier(): HTMLPurifier
    {
        if (self::$purifier !== null) {
            return self::$purifier;
        }

        $config = HTMLPurifier_Config::createDefault();

        $config->set(
            'HTML.Allowed',
            'p,br,strong,em,h1,h2,h3,a[href|title|rel|target],ul,ol,li,'
            .'span[data-corner-type|data-corner-id|data-corner-title|data-corner-thumbnail|data-corner-href]'
        );

        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
        ]);

        $config->set('Attr.AllowedRel', ['noopener', 'noreferrer']);

        $config->set('HTML.TargetBlank', true);

        // storage/app is gitignored, so a fresh clone doesn't have this yet.
        File::ensureDirectoryExists(storage_path('app/htmlpurifier'));
        $config->set('Cache.SerializerPath', storage_path('app/htmlpurifier'));

        // The ID and Rev namespace the cached definition. Bump Rev when the data-corner-*
        // attributes change.
        $config->set('HTML.DefinitionID', 'history-body');
        $config->set('HTML.DefinitionRev', 2);

        // This call finalizes the config: every set() must come before it.
        $def = $config->maybeGetRawHTMLDefinition();
        if ($def !== null) {
            $def->addAttribute('span', 'data-corner-type', 'Text');
            $def->addAttribute('span', 'data-corner-id', 'Text');
            $def->addAttribute('span', 'data-corner-title', 'Text');
            $def->addAttribute('span', 'data-corner-thumbnail', 'Text');
            $def->addAttribute('span', 'data-corner-href', 'Text');
        }

        return self::$purifier = new HTMLPurifier($config);
    }
}
