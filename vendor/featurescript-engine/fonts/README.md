# Fonts for sketch text

The fonts `@skText` draws with, as Onshape's sketch text does (batches 091, 185, 186): its outlines are these versions'.

| file | font | version | from | licence |
|---|---|---|---|---|
| OpenSans-Regular.ttf, -Bold, -Italic, -BoldItalic | Open Sans | 1.10 | Debian's `fonts-open-sans` 1.11 | Apache-2.0 (OpenSans-COPYRIGHT, LICENSE-Apache-2.0) |
| Arimo-Regular.ttf, -Italic, -BoldItalic | Arimo | 1.33 | Debian's `fonts-croscore` 20201225 | OFL-1.1 (Arimo-COPYRIGHT) |
| Arimo-Bold.ttf | Arimo | 1.23 | Debian's `fonts-croscore` 1.23.0 | Apache-2.0 (LICENSE-Apache-2.0; "Digitized data copyright (c) 2010-2012 Google Corporation") |
| Tinos-Regular.ttf, -Bold, -Italic, -BoldItalic | Tinos | 1.33 | Debian's `fonts-croscore` 20201225 | OFL-1.1 (Arimo-COPYRIGHT, the package's) |
| AllertaStencil-Regular.ttf | Allerta Stencil | 1.02 | google/fonts, `ofl/allertastencil` | OFL-1.1 (AllertaStencil-OFL.txt) |
| DroidSansMono.ttf | Droid Sans Mono | 1.00 | Ubuntu's `fonts-droid` 4.3-3ubuntu1.2 (AOSP `frameworks/base` data/fonts) | Apache-2.0 (LICENSE-Apache-2.0; © 2006–2010 Google Corp.) |
| NotoSans-Regular.ttf, -Bold, -Italic, -BoldItalic | Noto Sans | 1.05 | google/fonts, `apache/notosans` at 7c4482d (2015) | Apache-2.0 (LICENSE-Apache-2.0) |
| NotoSerif-Regular.ttf, -Bold, -Italic, -BoldItalic | Noto Serif | 1.04 | google/fonts, `apache/notoserif` at 40e62b2 (2015) | Apache-2.0 (LICENSE-Apache-2.0) |
| RobotoSlab-Regular.ttf, -Bold | Roboto Slab | 1.100263 (2013) | google/fonts, `apache/robotoslab` at its first commit (90abd17) | Apache-2.0 (LICENSE-Apache-2.0; "Font data copyright Google 2013") |

The current releases differ (Open Sans 3's "I" is 200 to 370 units, Onshape's 201 to 371 as in 1.10; Roboto Slab 2 is
a variable font). Onshape's Arimo Bold is 1.23, its other Arimos 1.33; its Noto Sans 1.05 and Noto Serif 1.04, not
Debian's `fonts-noto-core` 20200323 or 20201225 (their "Ag" 0.003 to 0.03 mm² off), nor Noto Serif's first Google
Fonts release (its italic 0.003 mm² off) (batch 185). The Noto Sans CJK fonts (OpenType, CFF outlines) aren't here: the engine refuses them. Any
other name is Open Sans Regular, as std documents.
