# Jo's Barbershop

Logo i grafički materijali za Jo's Barbershop.

| Mapa | Sadržaj |
|------|---------|
| `reference/` | Izvorne fotografije i slike postojećeg loga |
| `images/` | Fotografije i slike za web stranicu |
| `hairs/` | Materijal za web stranicu |
| `logo/` | Čisti master logo (SVG i PNG 2048 x 2048 px), opis u `logo/README.md` |
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

**Ponašanje**

- Nosač i zid stoje mirno, disk se okreće oko okomite osi, kao viseća reklama.
- Svijetli samo logo ("Jo's" i red BARBERSHOP), disk i nosač ne svijetle.
- Disk se stalno polako okreće. Pri scrollu se okretanje ubrza i znak se odmakne prema sljedećoj sekciji.
- Pozadina je tamna.
