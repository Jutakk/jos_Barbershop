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
| `tools/` | Sinkronizacija s Localom (`jos-sync.ps1`), 360 slika lokala (`panorama.py`), papir (`paper.py`) |

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
- Skripta nikad ne stane bez poruke: klik u prozor je ne pauzira (QuickEdit isključen), naslov prozora pokazuje
  vrijeme zadnje provjere i verziju u Localu (`Jo's sync 21:40:05 Local: 495413b`), zaključan fajl teme se
  javi umjesto beskonačnog čekanja, a kad povuče novu verziju same sebe, pokrene je u novom prozoru.

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
- Pozadina svih stranica je papir iz `images/white-paper-texture.jpg`. `python3 tools/paper.py` od njega napravi
  `assets/images/paper.webp`: pločicu 1024 x 1024 bez spojeva, s izravnanim osvjetljenjem i mekšim, finim zrnom
  (55 % kontrasta fotografije). Na stranici se ponavlja u veličini 800 px, oko 3D scene 12 x 6 puta.
  Na naslovnoj je papir u 3D prostoru, na unutarnjoj strani velike kugle oko cijele scene, pa se okreće zajedno sa
  zgradom kad je okrećeš. Linije fasade su malo podebljane (1,5 px, na mobitelu 1,3 px, three.js LineMaterial). Na naslovnoj zaglavlje
  nema svoju traku papira, pa je papir jedan cijeli; tekst stranica blijedi ispod zaglavlja. Linije fasade, trake u lukovima i natpis u temelju su smeđi (`#5b3517`), tekst je tamnosmeđa
  tinta (`#2b1d14`). Pod mišem se otvor prozora ili vrata ispuni bijelom. Znak ostaje tamnosmeđi metal sa
  svijetlim logom. U lokalu tekst stoji na svijetlom staklu boje papira.

**Okretanje zgrade**

- Zgrada se hvata mišem ili prstom i okreće: lijevo i desno (do skoro bočnog pogleda), gore i dolje.
  Okrenuta prema gore pokaže temelj s footerom. Brzi potez se još malo okreće sam.
- Scroll prema dolje gura zgradu po osi Z u dubinu: zgrada se udaljava i smanjuje, pa se vidi cijela, s
  footerom u temelju. Scroll prema gore je vraća do prvog kadra. Na mobitelu: dva prsta stisneš za u dubinu.
- Scroll u stranu (touchpad, ili Shift i kotačić) vodi uz ulicu prema dalekim lukovima i natrag.
- Tipkovnica: strelice okreću zgradu, Shift i strelice idu uz ulicu, Page Down gura zgradu u dubinu, Page Up je vraća.
- Povlačenje nikad ne otvara stranicu, otvara je samo pravi klik.

**Footer u temelju**

- Footer je upisan u temelj zgrade, ispod linije tla, u 4 kolone poravnate lijevo
  (`jos_footer_columns()` u `functions.php`). Prva kolona počinje na lijevom kutu kuće, svaka je široka
  koliko njen najduži red, redovi u koloni stoje jedan ispod drugog. Svi redovi svih kolona stoje u istim
  linijama. Malo logo stoji iznad prve kolone, pa su prvi redovi svih kolona u istoj liniji (© 2026 Jo's
  Barbershop, Di-Fr 10-19 Uhr, Leistungen, Gumpendorfer Straße 127); od loga do prvog reda je isti razmak kao
  između redova:
  1. malo logo, © 2026 Jo's Barbershop, Alle Rechte vorbehalten, Erstellt von + logo die aigentur
     (EN: All rights reserved, Made by + logo)
  2. radno vrijeme: Di-Fr 10-19 Uhr, Sa 10-18 Uhr, So&Mo geschlossen (EN: Tue-Fri 10-19, Sat 10-18,
     Sun&Mon closed)
  3. izbornik: Leistungen, Über uns, Galerie, Kontakt, Impressum, Datenschutz, Cookies, Häufige Fragen
     (EN: Services, About us, Gallery, Contact, Imprint, Privacy, Cookies, FAQ)
  4. Gumpendorfer Straße 127, 1060 Wien (oba reda vode na Google Maps), telefon
- Logo die aigentur (`assets/images/die-aigentur-mark.svg`, iz iks.haus teme) stoji iza "Erstellt von", u
  boji teksta footera; slova su mu visoka kao velika slova reda i stoje na istoj liniji. Vodi na
  https://dieaigentur.at/ u novoj kartici.
- Hover na svim linkovima footera (i na logu die aigentur): smeđi blok iza linka, slova u svijetloj boji papira,
  kao gumbi na vijencu. Isto u temelju i u običnom footeru (tamo i fokus tipkovnicom).
- Čita se kad se zgrada okrene prema gore ili gurne u dubinu; redovi ne blijede u daljinu. Linkovi pod mišem
  zasvijetle: stranice otvaraju svoj luk, Häufige Fragen otvara Kontakt pomaknut do pitanja (adresa `/#faq`).
- Telefon se upisuje u Customizeru (sekcija "Jo's Barbershop", polje "Telefon"); dok je prazno, kolona 4 ima
  samo adresu. Telefon ide i u HairSalon schemu.
- Impressum, Datenschutz i Cookies tema sama napravi kao stranice s "Inhalt folgt." (`impressum`,
  `datenschutz`, `cookies`) i na engleskom kao Imprint, Privacy i Cookies s "Content follows."
  (`impressum-en`, `datenschutz-en`, `cookies-en`), pri prvom otvaranju stranice, bez prijave. Tekst se piše
  u WordPressu.
- Obični HTML footer s istim kolonama ostaje za tipkovnicu, čitače ekrana i Google: na naslovnoj stoji ispod
  ekrana i izađe kad neki njegov link dobije fokus, na ostalim stranicama je normalan footer (4 kolone,
  na tabletu 2, na mobitelu jedna ispod druge).

**Favicon**

- Znak lokala: bijeli "Jo's" iz loga (`logo/jos-barbershop-logo-transparent.svg`, bez BARBERSHOP, slova malo
  podebljana da se čitaju na 16 px) na crnom krugu. `assets/images/favicon.ico` (16, 32, 48 px),
  `favicon.svg` i `apple-touch-icon.png` (180 px, na papiru, za mobitele).
- Ako se u WordPressu postavi Site Icon (Prilagodi, Website-Information), on ima prednost.

**Galerija**

- Iza luka Galerie je krug od 12 fotografija u formatu 2:3, po uzoru na Codrops demo "Cinematic Scroll
  Animations", prvu varijantu (`reference/GALERY.zip`). Kod je napisan iznova za three.js i GSAP u `scene.js`.
- Ulazak: krug se vrti, gledan izvana i odozgo, a kamera se spusti u njegovu sredinu. Zaustavi se tako da
  je Jo sprijeda (`assets/images/jo.webp`, iz `images/jo.webp`). Dok se vrti, oko njega lete tanke smeđe linije.
- Unutra: povlačenje mišem ili prstom, kotačić ili strelice lijevo i desno okreću krug. Klik na fotografiju je
  okrene naprijed i poveća da popuni visinu ekrana. Drugi klik, povlačenje ili Esc vraćaju cijeli krug, a tek
  sljedeći Esc izlazi sa stranice.
- Fotografije oko Joa su slike sa stranice Galerie u WordPressu (blok Galerie ili slike). Preporuka je 11
  fotografija frizura, uspravnih 2:3 (na primjer 1200 x 1800 px). Ako ih je manje, ponavljaju se.
- Dok na stranici nema fotografija, ili uz isključene animacije, stranica Galerie ostaje obična stranica.

**Izbornik na vijencu**

- Na gornjoj crti vijenca (prednji rub, najgornja crta gledano s ulice) u jednom zbijenom redu stoji izbornik:
  LEISTUNGEN, ÜBER UNS, GALERIE, KONTAKT, DE, EN, bez točaka između, malo iznad crte. Red počinje točno na lijevom kutu
  zgrade i ide udesno; okreće se sa zgradom i ne blijedi u daljinu.
- Gumbi su puni smeđi sa svijetlim slovima u fontu stranice. Pod mišem se rastežu kao Animated Top Dock iz
  ThreeUI (MIT licenca, `assets/js/vendor/threeui.LICENSE.txt`): gumb pod mišem i njegovi susjedi se šire
  (blizina 132 px, rast 54 px, opruga 0.19 / 0.70), ostali se stišću, pa red ostaje iste duljine. Na mobitelu,
  bez miša i uz isključene animacije gumbi miruju.
- Klik na gumb: klik na stranicu vodi kameru kroz njezin luk, klik na jezik otvara tu verziju.
- Na računalu je obični izbornik u zaglavlju skriven (ostaje za tipkovnicu i čitače ekrana i pojavi se kad
  dobije fokus). Na mobitelu ostaje u zaglavlju, a DE EN stoje gore desno.

**Jezici: DE, EN**

- Njemački je osnovni, engleski je `/?lang=en`. Naslovnica u `<head>` navodi obje verzije (hreflang) za Google.
- Sve je prevedeno: njemačka verzija je cijela na njemačkom, engleska cijela na engleskom.
- Stranice iza lukova postoje po jeziku: `leistungen`, `leistungen-en` i tako za `ueber-uns`, `galerie`,
  `kontakt`. Tema ih sama napravi i jednom upiše prvi sadržaj (cjenik, Über uns, Kontakt s FAQ), poslije se
  uređuju u WordPressu. Prijevodi su u `jos_room_words()` u `functions.php`.
- Cjenik (13 usluga u 4 skupine, iz `jos_room_words()`) tema jednom upiše na stranice `leistungen` i
  `leistungen-en` (verzija `prices-2026-10-05`), bez prijave; ako stranice nema, napravi je. Što je prije bilo na
  stranici ostaje u WordPressu kao revizija.
- Cjenik na njemačkom ima njemačke nazive usluga (Studentenschnitt, Heißtuchrasur, Kombi Haarschnitt &
  Augenbrauen, ...). Na postojećoj stranici Leistungen tema jednom zamijeni stare engleske nazive njemačkima.
- Kratki tekstovi teme (izbornik, uputa u lokalu, footer, slogan) su u `inc/languages.php`.
- Slogan: "dein Selbstbewusstsein beginnt hier" na njemačkom, "your confidense starts here" na engleskom.
  Kad najduža riječ ne stane lijevo od kuće, naslov se smanji (najviše na 60 %) dok ne stane.
- Arapskog više nema: arapske stranice (`leistungen-ar`, ...) tema jednom premjesti u smeće.

**Lukovi su izbornik**

- Lukovi zdesna nalijevo: izlog, vrata, izlog, izlog.
- Rub svakog luka (između dva luka kamenova) je smeđ, a po njemu u boji papira teče traka s imenom stranice, npr. `LEISTUNGEN  ·`: gore uz
  lijevi dovratak, preko luka i dolje uz desni. Kad se fasada iscrta, traka jednom brzo protrči okolo, uspori
  i dalje teče polako.
- Cijeli prozor ili cijela vrata su gumb: pod mišem se otvor ispuni bijelom, linije luka i
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

- `front-page.php`: hero s 3D znakom; malo JO'S (kao red ispod slogana) odmah iznad slogana, pa riječ ispod riječi:
  dein / Selbstbewusstsein / beginnt / hier (EN: your / confidense / starts / here), ispod BARBERSHOP in
  1060 WIEN (EN: VIENNA). Svaki red završava točno na rubu svog zadnjeg slova (prazan prostor sa strane slova se
  oduzme), pa su desni rubovi poravnati u pikselu. JO'S stoji iznad najvišeg slova prve riječi s istim razmakom
  kao iznad "your" (u "dein" se "d" diže više, pa se JO'S podigne toliko). Tekst je
  zalijepljen za kuću u prostoru: u prvom kadru stoji uz donji lijevi kut kuće, poravnat desno, svaki red završava
  7 mm (26 px) lijevo od ruba kuće, zadnji red na liniji tla. Kad se zgrada okreće, gura u dubinu ili ide uz ulicu,
  tekst je prati i crta se u perspektivi (`scene.js`, CSS matrix3d, tekst ostaje pravi tekst). Gdje u prvom
  kadru nema mjesta (mobitel) stoji dolje lijevo na ekranu. Zaglavlje nema natpis JO'S BARBERSHOP, samo izbornik
  (na računalu skriven, jer je izbornik na vijencu). Između "hier" i "BARBERSHOP in 1060 WIEN" stoji zeleni gumb
  "Reservierung" (EN "Reservation", `jos_reservation_button()`, po gumbu s Uiverse.io, MuhammadHasann): tri biljke
  vise preko gornjeg ruba i njišu se dok je miš na gumbu ili ima fokus. Vodi na Termin-Link iz Customizera
  (booking stranica u novoj kartici); dok link nije upisan, otvara stranicu Kontakt. Gumb "Termin buchen" je i na
  stranici Kontakt. Zatim četiri stranice iza lukova i X za povratak na ulicu
- `assets/js/scene.js`: three.js scena (znak, fasada, trake u lukovima, žuti otvori, footer u temelju, kamera uz ulicu i
  kroz luk, lokal iza vrata), ES modul preko WordPress Script Modules API. Samo crta; klik na luk javlja kao
  `jos:open`, klik na redak u temelju kao `jos:link`. Oštrina najviše 1.5 piksela po CSS pikselu; kad grafika ne
  stigne sličicu u 24 ms (prosjek 90 sličica), scena se crta s četvrtinu manje piksela, do 0.75, pa prati miš bez
  kašnjenja. Sjaj loga na znaku je ispečen u `assets/images/logo-glow.webp` (`tools/logo_glow.py`, isti koraci kao
  bloom koji je bio prije) i stoji na oba lica diska kao dodani sloj: nema više bloom prolaza preko cijelog ekrana
  u svakoj sličici (12 prolaza, većina posla grafičke kartice), scena je oko 2 puta brža.
- `assets/js/facade.js`: linije prizemlja fasade s vremenima iscrtavanja, lukom kojem pripadaju i položajem lukova,
  generira ih `fasada/build_facade.py`
- `assets/js/motion.js`: GSAP drži sve vrijednosti: položaj na ulici (`jos:street`, scroll, povlačenje, strelice),
  put kamere kroz luk (`jos:view`), pogled u lokalu (`jos:look`), otvaranje i zatvaranje stranica, adrese i tipka Natrag
- `assets/js/vines.js`: zeleni puzavci vise s gornjeg ruba ekrana na naslovnici, kao zelenilo na zidovima lokala,
  i njihanje biljaka na gumbu Reservierung. Tri oblika listova (gumb s Uiverse.io, MuhammadHasann) su jednom u
  `assets/images/plants.svg` (simboli `plant-0` do `plant-2`), svaki puzavac je lanac od njih, svaka karika se njiše
  oko točke na kojoj visi (GSAP), vjetar prolazi slijeva nadesno. Pri učitavanju naslovnice puzavci izrastu odozgor
  prema dolje, karika po karika, dok se fasada crta (počnu kad scena dobije .is-ready, najkasnije nakon 4 s). Dva gusta zida: lijevo iznad hero teksta, desno
  do ruba ekrana, najduži uz rub; sredina (izbornik na vijencu, znak) ostaje slobodna. Na mobitelu samo desni zid,
  desno od izbornika u zaglavlju. Klikovi prolaze kroz lišće, kroz luk u stranicu puzavci nestanu, bez pokreta
  (reduced motion) vise mirno. Uvijek isti raspored (stalni seed).
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

Status 0.11.10: znak na fasadi koja se iscrta pri učitavanju, zgrada se okreće povlačenjem, scroll gura zgradu po osi Z u dubinu, lukovi s
tekućim trakama kao izbornik, cijeli prozor ili vrata kao gumb, klik vodi kameru kroz luk do četiri stranice, lokal
iza vrata s 360 fotografijom, footer upisan u temelj, sve na papiru sa smeđim linijama, izbornik na vijencu, njemački i engleski. Cjenik, Über uns i Kontakt imaju sadržaj. Slijede Galerie, Impressum i Datenschutz.

