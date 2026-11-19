# Third-party notices

Ghar's own code is under the [MIT licence](./LICENSE). A built copy of Ghar, including the release
image, also carries other people's work under their own licences.

## Fonts

`npm run build` downloads these typefaces from Google Fonts and puts them in `public/build/assets`,
so Ghar serves them itself and nobody's browser asks Google for them. That makes every image a
copy of the fonts, and their licences ask for the notices below to travel with them.

| Typeface       | Where Ghar uses it                            | Licence                   |
| -------------- | --------------------------------------------- | ------------------------- |
| Hanken Grotesk | Interface and body text                       | SIL Open Font License 1.1 |
| Newsreader     | The wordmark, titles, dates                   | SIL Open Font License 1.1 |
| Patrick Hand   | Note bodies and coupon titles in Our Exchange | SIL Open Font License 1.1 |

- Hanken Grotesk: Copyright 2021 The Hanken Grotesk Project Authors
  (https://github.com/marcologous/hanken-grotesk)
- Newsreader: Copyright 2020 The Newsreader Project Authors
  (https://github.com/productiontype/Newsreader)
- Patrick Hand: Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at)

The licence text is in [`LICENSES/OFL-1.1.txt`](./LICENSES/OFL-1.1.txt).

## Packages

PHP packages are installed into `vendor/`, each with its own licence file, and stay there in the
image; `composer licenses` lists them. All are under permissive licences except
[HTML Purifier](https://htmlpurifier.org), which is LGPL-2.1-or-later and is used unmodified.

The JavaScript the browser runs is built from the packages in `package.json`, all under permissive
licences (MIT, ISC, 0BSD or Apache-2.0). `package-lock.json` records the licence of each.
