# Third-party notices

Ghar's own code is under the [MIT licence](./LICENSE). A built copy of Ghar, including the release
image, also carries other people's work under their own licences.

## Fonts

`npm run build` downloads this typeface from Google Fonts and puts it in `public/build/assets`,
so Ghar serves it itself and nobody's browser asks Google for them. That makes every image a
copy of the fonts, and their licences ask for the notices below to travel with them.

| Typeface                   | Where Ghar uses it   | Licence                   |
| -------------------------- | -------------------- | ------------------------- |
| Atkinson Hyperlegible Next | Every word on a page | SIL Open Font License 1.1 |

- Atkinson Hyperlegible Next: Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors
  (https://github.com/googlefonts/atkinson-hyperlegible-next)

The licence text is in [`LICENSES/OFL-1.1.txt`](./LICENSES/OFL-1.1.txt).

## Packages

PHP packages are installed into `vendor/`, each with its own licence file, and stay there in the
image; `composer licenses` lists them. All are under permissive licences except
[HTML Purifier](https://htmlpurifier.org), which is LGPL-2.1-or-later and is used unmodified.

The JavaScript the browser runs is built from the packages in `package.json`, all under permissive
licences (MIT, ISC, 0BSD, BSD-3-Clause or Apache-2.0). `package-lock.json` records the licence of each.

## Map data

Our History's map shows data from [OpenStreetMap](https://www.openstreetmap.org/copyright), © its
contributors, under the Open Database License, served as tiles by
[OpenFreeMap](https://openfreemap.org). The credit stays on the map, as the licence requires.
