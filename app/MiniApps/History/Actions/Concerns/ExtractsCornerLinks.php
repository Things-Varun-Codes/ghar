<?php

namespace App\MiniApps\History\Actions\Concerns;

use App\Shell\Services\LinkableEntities;
use Dom\HTMLDocument;

trait ExtractsCornerLinks
{
    /** @return list<string> E.g. ['corner.song:5', 'corner.movie:12'] */
    protected function extractCornerLinks(?string $html, LinkableEntities $linkable): array
    {
        if ($html === null || trim($html) === '') {
            return [];
        }

        $allowed = $linkable->registeredTypes();
        if ($allowed === []) {
            return [];
        }

        $doc = HTMLDocument::createFromString($html, LIBXML_NOERROR, 'UTF-8');

        $refs = [];
        foreach ($doc->querySelectorAll('span[data-corner-type][data-corner-id]') as $node) {
            $type = $node->getAttribute('data-corner-type');
            $id = (int) $node->getAttribute('data-corner-id');
            if ($id <= 0) {
                continue;
            }
            if (! in_array($type, $allowed, true)) {
                continue;
            }

            $refs[] = $type.':'.$id;
        }

        return array_values(array_unique($refs));
    }
}
