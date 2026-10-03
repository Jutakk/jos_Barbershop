# logo

Čisti master logo "Jo's BARBERSHOP".

| Datoteka | Sadržaj |
|----------|---------|
| `jos-barbershop-logo.svg` | Vektorski master: bijeli logo (#FFFFFF) na crnoj pozadini (#000000), 2048 x 2048 |
| `jos-barbershop-logo-2048.png` | PNG 2048 x 2048, bijeli logo na crnoj pozadini |
| `jos-barbershop-logo-transparent.svg` | Isti logo bez pozadine, za svjetleći sloj na 3D disku |
| `jos-barbershop-logo-transparent-2048.png` | PNG 2048 x 2048, bijeli logo na prozirnoj pozadini |
| `izvor/` | Skripta iz koje se master ponovno gradi |

## Struktura SVG-a

- `#wordmark`: rukom pisani "Jo's", zasebne putanje `#J`, `#o`, `#apostrophe` i `#s`
- `#barbershop`: slova BARBERSHOP kao putanje (`#letter-1-B` do `#letter-10-P`) i crtice `#dash-left` i `#dash-right`

Sva slova su pretvorena u putanje, za otvaranje ne treba nijedan font.

## Kako je master napravljen

1. "J", "o", apostrof i "s" preuzeti su iz vektorskog crteža `reference/jos-logo.svg`. Crtež se sa znakom na fasadi poklapa s korelacijom 0,964 i ispravnih je proporcija.
2. Na slovu "o" uklonjena su tri zalutala komadića od precrtavanja. Stepenica na vanjskom rubu i valoviti unutarnji rub gore lijevo premošteni su glatkim krivuljama. Ostala slova crteža nisu mijenjana.
3. BARBERSHOP je ispisan u fontu Arial Regular. Usporedbom s fotografijom znaka Arial Regular se poklopio najbolje (0,908). Arial Bold (0,860) i drugi fontovi bez serifa bili su slabiji. Visina velikih slova izmjerena je na ispravljenom znaku, a razmak slova (0,052 em) i položaj usklađeni su s rasporedom slova u crtežu.
4. Crtice imaju duljinu i položaj iz crteža, ravne krajeve i debljinu poteza Arial Regulara. Obje stoje na istoj visini, kao na znaku. U crtežu je desna bila oko 6 jedinica viša.

## Položaj na okruglom znaku (za 3D)

Na pravom znaku disk i logo stoje ovako, u koordinatama SVG-a (px):

- središte diska: x = 949.1, y = 1078.7
- polumjer diska: 876.7

Tekstura prednje strane diska dobiva se tako da se oko tog središta nacrta krug tog polumjera, a logo ostane na svom mjestu.
