# Third-party notices

Ghar's own code is under the [MIT licence](./LICENSE). A built copy of Ghar, including the release
image, also carries other people's work under their own licences.

## Fonts

`npm run build` downloads these typefaces from Google Fonts and puts them in `public/build/assets`,
so Ghar serves them itself and nobody's browser asks Google for them. That makes every image a
copy of the fonts, and their licences ask for the notices below to travel with them.

| Typeface         | Where Ghar uses it               | Licence                   |
| ---------------- | -------------------------------- | ------------------------- |
| Instrument Sans  | Body text                        | SIL Open Font License 1.1 |
| Instrument Serif | The wordmark, page titles, dates | SIL Open Font License 1.1 |
| Fredoka          | Our Corner                       | SIL Open Font License 1.1 |
| Patrick Hand     | Handwriting in Our Mailbox       | SIL Open Font License 1.1 |
| Special Elite    | The printed forms in Our Mailbox | Apache License 2.0        |

- Instrument Sans: Copyright 2022 The Instrument Sans Project Authors
  (https://github.com/Instrument/instrument-sans)
- Instrument Serif: Copyright 2022 The Instrument Serif Project Authors
  (https://github.com/Instrument/instrument-serif)
- Fredoka: Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One)
- Patrick Hand: Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at)
- Special Elite: Copyright (c) 2010 by Brian J. Bonislawsky DBA Astigmatic (AOETI). All rights
  reserved.

The licence texts are in [`LICENSES/OFL-1.1.txt`](./LICENSES/OFL-1.1.txt) and
[`LICENSES/Apache-2.0.txt`](./LICENSES/Apache-2.0.txt).

## Packages

PHP packages are installed into `vendor/`, each with its own licence file, and stay there in the
image; `composer licenses` lists them. All are under permissive licences except
[HTML Purifier](https://htmlpurifier.org), which is LGPL-2.1-or-later and is used unmodified.

The JavaScript the browser runs is built from the packages in `package.json`, all under permissive
licences (MIT, ISC, 0BSD or Apache-2.0). `package-lock.json` records the licence of each.
