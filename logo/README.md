# logo

Čisti master logo "Jo's BARBERSHOP", rekonstruiran prema fotografijama iz `reference/` i `images/`.

| Datoteka | Sadržaj |
|----------|---------|
| `jos-barbershop-logo.svg` | Vektorski master: bijeli logo (#FFFFFF) na crnoj pozadini (#000000), 2048 x 2048 |
| `jos-barbershop-logo-2048.png` | PNG 2048 x 2048, bijeli logo na crnoj pozadini |
| `jos-barbershop-logo-transparent.svg` | Isti logo bez pozadine, za svjetleći sloj na 3D disku |
| `jos-barbershop-logo-transparent-2048.png` | PNG 2048 x 2048, bijeli logo na prozirnoj pozadini |
| `izvor/` | Skripte i izmjereni podaci iz kojih se master ponovno gradi |

## Struktura SVG-a

- `#wordmark`: rukom pisani "Jo's", zasebne putanje `#J`, `#o`, `#apostrophe` i `#s`
- `#barbershop`: slova BARBERSHOP kao putanje (`#letter-1-B` do `#letter-10-P`) i crtice `#dash-left` i `#dash-right`

Sva slova su pretvorena u putanje, za otvaranje ne treba nijedan font.

## Kako je logo rekonstruiran

1. Oblici slova "o" i "s" te početni tanki potez slova "J" izmjereni su na fotografiji izloga (`reference/izlog.webp`), gdje su slova najveća.
2. Prave proporcije izmjerene su na fotografiji okruglog znaka (`reference/znak-blizu.jpg`). Disk je krug, pa je kut snimanja uklonjen tako da je elipsa diska vraćena u krug. Fotografija izloga snimljena je pod kutom i bila je vodoravno stisnuta za oko 22 posto. To je ispravljeno.
3. Stablo slova "J" izmjereno je na istom znaku, po oba ruba. Vrh je uži (16 px) od stabla (19,5 px) i zaobljen, gornji dio blago je zakrivljen (od 15 do 19 stupnjeva od okomice), sredina je ravna, a u visini lijeve crtice potez lomi pod blagim kutom na 35 stupnjeva i ravno se sužava do oštrog vrha repa.
4. Apostrof, red BARBERSHOP i crtice izmjereni su na istom znaku.
5. BARBERSHOP je složen u fontu Liberation Sans Regular, koji je metrički istovjetan Arialu i najbolje se poklopio sa znakom. Razmak slova je 0,077 em. Crtice su duge 1 em, debele kao potez slova "I" i stoje ispod sredine visine velikih slova, s jednakim razmakom do riječi s obje strane.

## Položaj na okruglom znaku (za 3D)

Na pravom znaku disk i logo stoje ovako, u koordinatama SVG-a (px):

- središte diska: x = 941.2, y = 1070.1
- polumjer diska: 862.5

Tekstura prednje strane diska dobiva se tako da se oko tog središta nacrta krug tog polumjera, a logo ostane na svom mjestu.
