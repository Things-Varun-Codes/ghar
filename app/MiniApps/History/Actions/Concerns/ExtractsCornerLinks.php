<?php

namespace App\MiniApps\History\Actions\Concerns;

use App\Shell\Services\LinkableEntities;

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

        // TipTap's HTML5 entities and bare attributes trip libxml's HTML4 parser.
        $previous = libxml_use_internal_errors(true);
        $doc = new \DOMDocument;
        $doc->loadHTML(
            '<?xml encoding="UTF-8"><div>'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $xpath = new \DOMXPath($doc);
        $nodes = $xpath->query('//span[@data-corner-type and @data-corner-id]');

        $refs = [];
        if ($nodes !== false) {
            foreach ($nodes as $node) {
                /** @var \DOMElement $node */
                $type = $node->getAttribute('data-corner-type');
                $rawId = $node->getAttribute('data-corner-id');

                $id = (int) $rawId;
                if ($id <= 0) {
                    continue;
                }
                if (! in_array($type, $allowed, true)) {
                    continue;
                }

                $refs[] = $type.':'.$id;
            }
        }

        return array_values(array_unique($refs));
    }
}
