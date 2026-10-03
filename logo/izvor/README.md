# izvor

Skripta koja gradi master logo u mapi `logo/` iz vektorskog crteža `reference/jos-logo.svg`.

## Ponovna izgradnja

Potrebno: Python 3 i paketi `numpy scipy svgelements fonttools cairosvg`.

Font Arial Regular nije u repozitoriju zbog licence. Skripta ga čita iz `logo/izvor/fonts/Arial.TTF`
ili s putanje u varijabli okruženja `ARIAL_TTF`. Na Windowsu je to `C:\Windows\Fonts\arial.ttf`.
Na Linuxu se dobiva iz Microsoftovog paketa core fontova:

```bash
mkdir -p logo/izvor/fonts && cd logo/izvor/fonts
curl -L -o arial32.exe https://downloads.sourceforge.net/corefonts/arial32.exe
cabextract -F Arial.TTF arial32.exe
cd ../../..
```

Zatim, iz korijena repozitorija:

```bash
pip install numpy scipy svgelements fonttools cairosvg
python3 logo/izvor/build_svg.py
```

Skripta piše sve četiri datoteke u `logo/` i ispisuje položaj diska.

## Datoteke

| Datoteka | Uloga |
|----------|-------|
| `build_svg.py` | Preuzima wordmark iz crteža, popravlja "o", slaže BARBERSHOP u Arialu i crtice, centrira na 2048 x 2048, izvozi SVG i PNG |
| `bezfit.py` | Pretvaranje popravljenih obrisa slova "o" u kubne Bézierove krivulje (točnost 0,05 jedinica) |
| `podaci/A_jos-logo2znak.npy` | Afina transformacija iz crteža na ispravljenu fotografiju znaka, za položaj diska |
| `podaci/disc_ellipse.npy` | Elipsa diska na fotografiji znaka |
