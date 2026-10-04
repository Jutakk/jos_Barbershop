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

- Otvorena stranica u Localu sama se osvježi kad sinkronizacija kopira nove datoteke teme
  (`assets/js/dev-reload.js`, radi samo na lokalnoj kopiji, nikad na pravoj stranici). Sve datoteke imaju
  vrijeme zadnje promjene u adresi, pa preglednik uvijek uzme nove.
- Otvorena stranica u Localu sama se osvježi kad sinkronizacija kopira nove datoteke teme
  (`assets/js/dev-reload.js`, radi samo na lokalnoj kopiji, nikad na pravoj stranici). Sve datoteke imaju
  vrijeme zadnje promjene u adresi, pa preglednik uvijek uzme nove.
- Izvor na računalu: `D:\CLAUDE_CODE\JoS_BARBER\jos-barbershop` (skripta sama nađe mapu u kojoj leži, pa se mapa smije premjestiti)
- Pokretanje: `powershell -ExecutionPolicy Bypass -File "D:\CLAUDE_CODE\JoS_BARBER\jos-barbershop\tools\jos-sync.ps1"`

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
- Linije u daljini blijede u tamu i ne svijetle.
- Ulica se nastavlja iza zgrade: na desnom kraju sve vodoravne linije idu dalje u beskonačnost. Na lijevom kraju
  zgrada jednostavno završava, a prazan prostor lijevo ostaje za tekst.
- Pri učitavanju stranice linije se iscrtaju redom, kao kad arhitekt crta: prvo vijenac i linija tla rastu od
  znaka prema oba kraja zgrade, pa rubovi zgrade, pa lukovi jedan po jedan (od dva uz znak prema van), svaki od
  tla uz oba dovratka do tjemena, a na kraju fuge, luk po luk, od vrha prema dolje.
- Prvi kadar je pogled s ulice u visini očiju: znak gore, a ispod njega cijelo prizemlje do tla.
- Mjere su uzete s ispravljene fotografije (`fasada/podaci/H_rect.npy`). Promjena crteža:
  `python3 fasada/build_facade.py` napiše `theme/jos-barbershop/assets/js/facade.js` i `fasada/fasada-prizemlje.svg`,
  a `--check` još i `fasada/provjera.png` s linijama preko fotografije.

**Ponašanje**

- Nosač i zid stoje mirno, disk se okreće oko okomite osi, kao viseća reklama.
- Svijetli samo logo ("Jo's" i red BARBERSHOP), disk i nosač ne svijetle.
- Disk se uvijek okreće istom sporom brzinom (jedan krug za oko 24 sekunde), i kod scrolla.
- Boje: sve što je bilo crno je vrlo tamna smeđa, ne previše topla (`#130e0b`: pozadina, disk, nosač, tamno staklo), a linije
  fasade i tanke crte su blijedo žute (`#f1e2a0`). Svijetli logo ostaje bijel.

**Scroll: lukovi su stranice**

- Lukovi zdesna nalijevo: izlog, vrata, izlog, izlog. Scroll vodi kameru niz ulicu od luka do luka.
- Kod svakog luka kamera stane ispred njega tako da se vidi cijeli prozor ili vrata, od tla do zaglavnog kamena,
  zatim uđe kroz luk u visini očiju i otvori se stranica preko cijelog ekrana.
- Stranice nemaju vlastitu pozadinu: tekst se pojavi i izblijedi sa scrollom, pa nikad nema ruba preko linija.
- Nakon stranice kamera izađe iz luka, vrati se na ulicu u prvi kadar sa znakom i odande prijeđe do
  sljedećeg luka i uđe u njega.
- Redom: Leistungen & Preise (izlog desno), Über uns (vrata), Galerie, Kontakt (izlog lijevo).
- Kroz vrata kamera ulazi u lokal: 360 fotografija lokala oko kamere (`images/google-maps-28.webp`, 8192 x 4096).
  Fotografija ostaje kakva jest, bez izoštravanja (`tools/panorama.py`): `lokal-360.webp` (8192 px, 1,1 MB) za
  računala, `lokal-360-mobile.webp` (4096 px, 0,6 MB) za mobitele. Učitava se tek kad kamera krene niz ulicu,
  pa ne ulazi u budžet prvog učitavanja. Pogled prvo ide ravno u lokal, prema stolicama i ogledalima, s ulazom
  iza leđa. Unutra se kut gledanja proširi s 30 na 70 stupnjeva.
- U lokalu stranica stoji (scroll ne radi): povlačenjem mišem ili prstom gledaš okolo i gore dolje, strelice na
  tipkovnici rade isto. Tekst Über uns stoji na tamnom staklu u kutu, uputa "Ziehen, um sich umzusehen" nestane
  nakon prvog povlačenja. Veliki X gore desno lagano pulsira; X ili Esc izvede van pred vrata, na stranu s koje
  si došao, i scroll ide dalje. Skok preko izbornika prolazi kroz lokal bez zaustavljanja.
- Bez animacija (prefers-reduced-motion) kamera stoji na prvom kadru, a stranice slijede jedna za drugom.

## Tema `theme/jos-barbershop`

Vlastita WordPress tema (PHP, SCSS, čisti JavaScript, GSAP, three.js), sve lokalno, bez CDN-a.

- `front-page.php`: hero s 3D znakom, naslov "your confidence starts here" (natpis s izloga trgovine), gumb "Termin buchen",
  zatim ulica i četiri stranice iza lukova
- `assets/js/scene.js`: three.js scena (znak, fasada, kamera niz ulicu, lokal iza vrata), ES modul preko WordPress Script Modules API
- `assets/js/facade.js`: linije prizemlja fasade s vremenima iscrtavanja i položajem lukova, generira ih `fasada/build_facade.py`
- `assets/js/motion.js`: GSAP i ScrollTrigger: položaj kamere na putu (`jos:path`), okret u lokalu (`jos:pan`), pojava teksta
- Stranice iza lukova su obične WordPress stranice s adresama `leistungen`, `ueber-uns`, `galerie` i `kontakt`.
  Tema ih sama napravi (sa "Inhalt folgt.") kad prijavljeni administrator otvori stranicu; sadržaj se piše u WordPressu.
  Izbornik u zaglavlju skače na njih.
- FAQ: u stranici Kontakt svako pitanje je blok "Details" (pitanje u naslovu, odgovor u sadržaju). Iz tih blokova
  tema sama složi FAQPage schemu.
- Prvi sadržaj stranica (04.10.2026, iz cjenika i opisa salona s booking stranice): tema ga jednom upiše u stranicu,
  samo dok u njoj stoji "Inhalt folgt.", a poslije se stranice uređuju u WordPressu (`jos_room_texts()` u `functions.php`):
  - Leistungen & Preise: cjenik po kategorijama (Herrenhaarschnitte, Bartpflege, Kinderhaarschnitte, Augenbrauen),
    usluga, trajanje i cijena, unutar kategorije od najjeftinije.
  - Über uns: uvod, tim (Inhaber Jwan; Deutsch, Englisch, Arabisch, Kurdisch) i "Was dich erwartet".
  - Kontakt: adresa (Gumpendorfer Straße 127, 1060 Wien, poveznica na Google Maps), Bushaltestelle Sonnenuhrgasse,
    radno vrijeme (Di bis Fr 10:00 bis 19:00, Sa 10:00 bis 18:00, Mo i So zatvoreno), plaćanje (gotovina, kreditna
    kartica) i FAQ sa 7 pitanja.
  - Galerie čeka fotografije.
- Adresa stoji i u footeru. Za Google i AI tražilice naslovnica nosi HairSalon schemu (adresa, radno vrijeme,
  plaćanje, jezici) iz `jos_shop()` u `functions.php`; promjena radnog vremena ide i tamo.
- `assets/scss/style.scss`: izvor stilova, prevodi se u `style.css`:
  `npx sass assets/scss/style.scss style.css --style=expanded --no-source-map` (u mapi teme)
- Gumb "Termin buchen": link se upisuje u Customizeru, sekcija "Jo's Barbershop", polje "Termin-Link"
  (stranica za rezervaciju ili `tel:+43...`). Dok link nije upisan, gumb vidi samo prijavljeni urednik.

Dijale (zadane vrijednosti dok ih ne promijenimo): VARIJACIJA 6, ANIMACIJA 9 (3D hero povezan sa scrollom), GUSTOĆA 4.

Status 0.5.0: znak na fasadi koja se iscrta pri učitavanju, scroll kroz lukove do četiri stranice, lokal iza vrata
s 360 fotografijom. Cjenik, Über uns i Kontakt imaju sadržaj. Slijede Galerie, DE i EN verzija, Impressum i Datenschutz.

