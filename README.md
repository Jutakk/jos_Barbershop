# Jo's Barbershop

Logo i grafički materijali za Jo's Barbershop.

| Mapa | Sadržaj |
|------|---------|
| `reference/` | Izvorne fotografije i slike postojećeg loga |
| `images/` | Fotografije i slike za web stranicu |
| `hairs/` | Materijal za web stranicu |
| `logo/` | Čisti master logo (SVG i PNG 2048 x 2048 px), opis u `logo/README.md` |
| `fasada/` | Prizemlje fasade kao crtež linijama za hero (`build_facade.py`, `fasada-prizemlje.svg`) |
| `theme/jos-barbershop/` | WordPress tema stranice |
| `tools/` | Sinkronizacija s Localom (`jos-sync.ps1`) |

## Sinkronizacija s Localom

Isto kao kod Zum kleinen Feinen: Claude pusha na granu `claude/jos-barbershop-logo-xgtbba`, a skripta
`tools/jos-sync.ps1` na računalu svakih 5 sekundi povlači promjene i kopira temu `theme/jos-barbershop`
u Local stranicu `C:\Users\User\Local Sites\jos-barbershop` (localhost:10098). Nove datoteke ubačene u
`reference`, `images` ili `hairs` skripta sama šalje na GitHub.

- Izvor na računalu: `D:\CLAUDE_CODE\jos-barbershop`
- Pokretanje: `powershell -ExecutionPolicy Bypass -File "D:\CLAUDE_CODE\jos-barbershop\tools\jos-sync.ps1"`

## Hero sekcija (3D)

Stranica počinje 3D scenom s okruglim znakom trgovine, kao na fasadi (`images/fasada.jpg`, `images/znak.jpg`).

**Geometrija znaka**

- Disk je ekstrudirani krug: debeli crni valjak s vidljivim rubom, logo na prednjoj i stražnjoj strani.
- Kroz središte diska prolazi okomita os rotacije. Na vrhu i dnu diska izlazi kao kratki čep.
- Oba čepa spaja polukružni crni nosač u obliku slova C koji ide oko desne strane diska, u istoj ravnini kao disk.
- Na sredini luka iz nosača izlaze dva kratka vodoravna kraka do okomite pločice pričvršćene na zid.
- Znak stoji okomito na zid: zid je s desne strane nosača.

**Fasada iza znaka**

- Zid kroz pločicu nosača je prizemlje prave zgrade s `images/fasada.jpg`, nacrtano samo tankim linijama:
  vijenac, četiri luka s dubinom špalete, klinasti kamenovi oko lukova i fuge.
- Znak visi na svom stvarnom mjestu, između trećeg i četvrtog luka. Fasada je zakrenuta tako da odgovara
  položaju znaka: pločica nosača sjedi na zidu, a ulica odlazi ulijevo u dubinu, kao na `images/znak.jpg`.
- Linije u daljini blijede u tamu i ne svijetle. Pri scrollu se zid udaljava zajedno sa znakom.
- Mjere su uzete s ispravljene fotografije (`fasada/podaci/H_rect.npy`). Promjena crteža:
  `python3 fasada/build_facade.py` napiše `theme/jos-barbershop/assets/js/facade.js` i `fasada/fasada-prizemlje.svg`,
  a `--check` još i `fasada/provjera.png` s linijama preko fotografije.

**Ponašanje**

- Nosač i zid stoje mirno, disk se okreće oko okomite osi, kao viseća reklama.
- Svijetli samo logo ("Jo's" i red BARBERSHOP), disk i nosač ne svijetle.
- Disk se stalno polako okreće. Pri scrollu se okretanje ubrza i znak se odmakne prema sljedećoj sekciji.
- Pozadina je tamna.

## Tema `theme/jos-barbershop`

Vlastita WordPress tema (PHP, SCSS, čisti JavaScript, GSAP, three.js), sve lokalno, bez CDN-a.

- `front-page.php`: hero s 3D znakom, naslov "your confidence starts here" (natpis s izloga trgovine), gumb "Termin buchen"
- `assets/js/scene.js`: three.js scena znaka, učitana kao ES modul preko WordPress Script Modules API
- `assets/js/facade.js`: linije prizemlja fasade, generira ih `fasada/build_facade.py`
- `assets/js/motion.js`: GSAP i ScrollTrigger, prikvačuje hero za jedan ekran scrolla i šalje napredak sceni
- `assets/scss/style.scss`: izvor stilova, prevodi se u `style.css`:
  `npx sass assets/scss/style.scss style.css --style=expanded --no-source-map` (u mapi teme)
- Gumb "Termin buchen": link se upisuje u Customizeru, sekcija "Jo's Barbershop", polje "Termin-Link"
  (stranica za rezervaciju ili `tel:+43...`). Dok link nije upisan, gumb vidi samo prijavljeni urednik.

Dijale (zadane vrijednosti dok ih ne promijenimo): VARIJACIJA 6, ANIMACIJA 9 (3D hero povezan sa scrollom), GUSTOĆA 4.

Status 0.2.0: hero s 3D znakom na fasadi nacrtanoj linijama. Slijede ostale sekcije, DE i EN verzija, FAQ, Impressum i Datenschutz.

