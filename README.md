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
- Disk se uvijek okreće istom sporom brzinom (jedan krug za oko 24 sekunde).
- Boje: sve što je bilo crno je vrlo tamna smeđa, ne previše topla (`#130e0b`: pozadina, disk, nosač, tamno staklo), a linije
  fasade i tanke crte su blijedo žute (`#f1e2a0`). Svijetli logo ostaje bijel.

**Okretanje zgrade**

- Zgrada se hvata mišem ili prstom i okreće: lijevo i desno (do skoro bočnog pogleda), gore i dolje.
  Okrenuta prema gore pokaže temelj s footerom. Brzi potez se još malo okreće sam.
- Scroll prema dolje vodi u dubinu, prema mjestu na koje pokazuje miš (kao zumiranje karte), pa se footer u
  temelju može približiti i pročitati. Scroll prema gore vraća natrag do prvog kadra. Na mobitelu isto radi s
  dva prsta.
- Scroll u stranu (touchpad, ili Shift i kotačić) vodi uz ulicu prema dalekim lukovima i natrag.
- Tipkovnica: strelice okreću zgradu, + i - idu u dubinu i natrag, Page Up i Page Down idu uz ulicu.
- Povlačenje nikad ne otvara stranicu, otvara je samo pravi klik.

**Footer u temelju**

- Footer (copyright, adresa, Impressum, Datenschutz) upisan je u temelj zgrade, ispod linije tla, u sredini
  ispod lukova. Čita se kad se zgrada okrene prema gore.
- Adresa vodi na Google Maps, Impressum i Datenschutz na svoje stranice: pod mišem zasvijetle i klikaju se.
  Impressum i Datenschutz se pojave sami čim te stranice postoje u WordPressu (`jos_footer_items()`).
- Obični HTML footer ostaje za tipkovnicu, čitače ekrana i Google: stoji ispod ekrana i izađe kad neki
  njegov link dobije fokus.

**Lukovi su izbornik**

- Lukovi zdesna nalijevo: izlog, vrata, izlog, izlog.
- U rubu svakog luka (između dva luka kamenova) teče traka s imenom stranice, npr. `LEISTUNGEN  ·`: gore uz
  lijevi dovratak, preko luka i dolje uz desni. Kad se fasada iscrta, traka jednom brzo protrči okolo, uspori
  i dalje teče polako.
- Cijeli prozor ili cijela vrata su gumb: pod mišem se otvor ispuni prozirnom blijedo žutom, linije luka i
  traka zasvijetle, pokazivač postane ruka.
- Klik na prozor ili vrata (ili na stavku izbornika u zaglavlju, ili na bilo koji link `#leistungen`, `#ueber-uns`, `#galerie`,
  `#kontakt`): kamera u oko 1,5 sekundi preleti pred luk i uđe kroz njega, a stranica se otvori preko cijelog
  ekrana. Tekst heroja se za to vrijeme makne.
- Natrag na ulicu: veliki X gore desno (lagano pulsira), tipka Esc, tipka Natrag u pregledniku ili ime u
  zaglavlju. Kamera izađe iz luka natrag u prvi kadar.
- Izbornik radi i dok je stranica otvorena: kamera izađe iz jednog luka i uđe u drugi. Otvorena stranica je
  označena u izborniku. Na mobitelu je izbornik u drugom redu zaglavlja.
- Svaka otvorena stranica ima svoju adresu (`/#kontakt`), pa se može poslati ili otvoriti izravno; tada je
  stranica odmah otvorena, a Natrag vodi na ulicu.
- Redom: Leistungen & Preise (izlog desno), Über uns (vrata), Galerie, Kontakt (izlog lijevo). Koji luk vodi
  na koju stranicu piše u `jos_rooms()` (`arch`, indeks u `FACADE_ARCHES`).
- Kroz vrata kamera ulazi u lokal: 360 fotografija lokala oko kamere (`images/google-maps-28.webp`, 8192 x 4096).
  Fotografija ostaje kakva jest, bez izoštravanja (`tools/panorama.py`): `lokal-360.webp` (8192 px, 1,1 MB) za
  računala, `lokal-360-mobile.webp` (4096 px, 0,6 MB) za mobitele. Učitava se tek 1,5 sekundi nakon iscrtavanja
  fasade (ili čim miš dođe na vrata), pa ne ulazi u budžet prvog učitavanja. Pogled prvo ide ravno u lokal,
  prema stolicama i ogledalima, s ulazom iza leđa. Unutra se kut gledanja proširi s 30 na 70 stupnjeva.
- U lokalu povlačenjem mišem ili prstom gledaš okolo i gore dolje, strelice na tipkovnici rade isto. Tekst
  Über uns stoji na tamnom staklu u kutu, uputa "Ziehen, um sich umzusehen" nestane nakon prvog povlačenja.
- Bez animacija (prefers-reduced-motion) sve se otvara i zatvara odmah, bez leta kamere i bez pulsiranja.
- Bez JavaScripta stranice jednostavno slijede jedna za drugom ispod heroja.

## Tema `theme/jos-barbershop`

Vlastita WordPress tema (PHP, SCSS, čisti JavaScript, GSAP, three.js), sve lokalno, bez CDN-a.

- `front-page.php`: hero s 3D znakom, naslov "your confidence starts here" (natpis s izloga trgovine), gumb "Termin buchen",
  četiri stranice iza lukova i X za povratak na ulicu
- `assets/js/scene.js`: three.js scena (znak, fasada, trake u lukovima, žuti otvori, footer u temelju, kamera uz ulicu i
  kroz luk, lokal iza vrata), ES modul preko WordPress Script Modules API. Samo crta; klik na luk javlja kao
  `jos:open`, klik na redak u temelju kao `jos:link`.
- `assets/js/facade.js`: linije prizemlja fasade s vremenima iscrtavanja, lukom kojem pripadaju i položajem lukova,
  generira ih `fasada/build_facade.py`
- `assets/js/motion.js`: GSAP drži sve vrijednosti: položaj na ulici (`jos:street`, scroll, povlačenje, strelice),
  put kamere kroz luk (`jos:view`), pogled u lokalu (`jos:look`), otvaranje i zatvaranje stranica, adrese i tipka Natrag
- Stranice iza lukova su obične WordPress stranice s adresama `leistungen`, `ueber-uns`, `galerie` i `kontakt`.
  Tema ih sama napravi (sa "Inhalt folgt.") kad prijavljeni administrator otvori stranicu; sadržaj se piše u WordPressu.
  Izbornik u zaglavlju ih otvara kao i klik na luk.
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
- Adresa stoji i u footeru (u temelju zgrade). Za Google i AI tražilice naslovnica nosi HairSalon schemu (adresa, radno vrijeme,
  plaćanje, jezici) iz `jos_shop()` u `functions.php`; promjena radnog vremena ide i tamo.
- `assets/scss/style.scss`: izvor stilova, prevodi se u `style.css`:
  `npx sass assets/scss/style.scss style.css --style=expanded --no-source-map` (u mapi teme)
- Gumb "Termin buchen": link se upisuje u Customizeru, sekcija "Jo's Barbershop", polje "Termin-Link"
  (stranica za rezervaciju ili `tel:+43...`). Dok link nije upisan, gumb vidi samo prijavljeni urednik.

Dijale (zadane vrijednosti dok ih ne promijenimo): VARIJACIJA 6, ANIMACIJA 9 (3D hero, lukovi kao izbornik), GUSTOĆA 4.

Status 0.7.0: znak na fasadi koja se iscrta pri učitavanju, zgrada se okreće povlačenjem, scroll vodi uz ulicu, lukovi s
tekućim trakama kao izbornik, cijeli prozor ili vrata kao gumb, klik vodi kameru kroz luk do četiri stranice, lokal
iza vrata s 360 fotografijom, footer upisan u temelj. Cjenik, Über uns i Kontakt imaju sadržaj. Slijede Galerie, DE i EN verzija, Impressum i Datenschutz.

