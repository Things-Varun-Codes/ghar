<?php

return [
    'ssr' => [
        'enabled' => false,
    ],

    'pages' => [
        'paths' => [
            // Only Inertia's test helpers read these; runtime resolution is the glob in
            // app.tsx.
            resource_path('js'),
        ],

        'extensions' => [
            'js',
            'jsx',
            'svelte',
            'ts',
            'tsx',
            'vue',
        ],
    ],

    'testing' => [
        'ensure_pages_exist' => true,
    ],

];
