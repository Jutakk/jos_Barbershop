# izvor

Skripte i izmjereni podaci iz kojih se gradi master logo u mapi `logo/`.

## Ponovna izgradnja

Potrebno: Python 3, paketi `numpy scipy shapely fonttools cairosvg` i font Liberation Sans Regular
na putanji `/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf` (Debian i Ubuntu paket `fonts-liberation`).

Iz korijena repozitorija:

```bash
pip install numpy scipy shapely fonttools cairosvg
python3 logo/izvor/build_svg.py
```

Skripta piše sve četiri datoteke u `logo/` i ispisuje položaj diska.

## Datoteke

| Datoteka | Uloga |
|----------|-------|
| `build_svg.py` | Raspored na platnu 2048 x 2048, Bézierove krivulje, SVG i PNG izvoz |
| `final_model.py` | Sklapa "J", "o", apostrof, "s", BARBERSHOP i crtice u koordinatama ispravljenog znaka |
| `model_decal.py` | Potezi "J", "o" i "s" izmjereni na fotografiji izloga |
| `fitdecal.py` | Zaglađivanje izmjerenih sredina i debljina poteza |
| `strokes.py` | Obris poteza iz sredine i debljine, s oštrim ili zaobljenim krajevima |
| `ringsmooth.py` | Zaglađivanje obrisa koje čuva oštre vrhove |
| `bezfit.py` | Pretvaranje obrisa u kubne Bézierove krivulje (točnost 0,1 px) |
| `textgeom.py` | Obrisi slova iz fonta |
| `podaci/meas.json` | Sredine i debljine poteza izmjerene na izlogu |
| `podaci/A_decal2rect1.npy` | Afina transformacija s izloga na ispravljeni znak |
| `podaci/tail_sign.npy` | Rep slova "J" izmjeren na znaku |
| `podaci/textfit.json` | Visina slova, razmak i položaj reda BARBERSHOP |
| `podaci/disc_ellipse.npy` | Elipsa diska na fotografiji znaka |
