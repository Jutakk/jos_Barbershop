<?php
/**
 * Impressum and Datenschutz in German and English (15.10.2026), after the Austrian law: § 5 ECG, § 63 GewO or
 * § 14 UGB, § 25 MedienG; DSGVO, DSG and § 165 TKG 2021. What only the owner knows (name, phone, e-mail, firm,
 * UID, the hosting and e-mail providers, how long data is kept) stands bold in square brackets, to be written
 * over in WordPress. The texts are written into the pages once (JOS_LEGAL_FILL), only while a page is empty or
 * still holds just "Inhalt folgt."; after that the pages are edited in WordPress and never touched again by the
 * theme.
 *
 * @package jos-barbershop
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Blocks from short pieces of HTML of the theme: a heading (level 2, under the title of the page), a paragraph,
 * or a list.
 *
 * @param array<int, array{0: string, 1: string|array<int, string>}> $parts Kind ('h', 'p' or 'ul') and its HTML.
 */
function jos_legal_blocks( array $parts ): string {
	$blocks = '';
	foreach ( $parts as $part ) {
		list( $kind, $html ) = $part;
		if ( 'h' === $kind ) {
			$blocks .= "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">" . $html . "</h2>\n<!-- /wp:heading -->\n\n";
		} elseif ( 'ul' === $kind ) {
			$items = '';
			foreach ( (array) $html as $item ) {
				$items .= "<!-- wp:list-item -->\n<li>" . $item . "</li>\n<!-- /wp:list-item -->\n";
			}
			$blocks .= "<!-- wp:list -->\n<ul class=\"wp-block-list\">" . $items . "</ul>\n<!-- /wp:list -->\n\n";
		} else {
			$blocks .= "<!-- wp:paragraph -->\n<p>" . $html . "</p>\n<!-- /wp:paragraph -->\n\n";
		}
	}
	return $blocks;
}

/**
 * Impressum and Datenschutz in one language.
 *
 * @param string $lang Language.
 * @return array<string, string> Address of the German page (impressum, datenschutz) and its content.
 */
function jos_legal_texts_in( string $lang ): array {
	// what the owner fills in: bold, in square brackets
	$fill = static fn( string $what ): string => '<strong>[' . esc_html( $what ) . ']</strong>';
	$link = static fn( string $url, string $text = '' ): string => '<a href="' . esc_url( $url ) . '">' . esc_html( $text ? $text : (string) preg_replace( '#^https?://#', '', $url ) ) . '</a>';
	$dsb  = 'Barichgasse 40-42, 1030 Wien';

	if ( 'de' === $lang ) {
		$owner = $fill( 'Vor- und Nachname des Inhabers, bei einem e.U. der Firmenwortlaut laut Firmenbuch' );

		$impressum = jos_legal_blocks(
			array(
				array( 'p', 'Informationen nach § 5 E-Commerce-Gesetz (ECG), § 63 Gewerbeordnung (GewO) beziehungsweise § 14 Unternehmensgesetzbuch (UGB) und Offenlegung nach § 25 Mediengesetz (MedienG).' ),
				array( 'h', 'Diensteanbieter und Medieninhaber' ),
				array( 'p', $owner . '<br>Jo’s Barbershop<br>Gumpendorfer Straße 127<br>1060 Wien, Österreich' ),
				array( 'h', 'Kontakt' ),
				array( 'p', 'Telefon: ' . $fill( 'Telefonnummer' ) . '<br>E-Mail: ' . $fill( 'E-Mail-Adresse' ) ),
				array( 'h', 'Unternehmen' ),
				array(
					'p',
					'Rechtsform: ' . $fill( 'Einzelunternehmen, oder eingetragenes Einzelunternehmen (e.U.), falls im Firmenbuch eingetragen' )
					. '<br>Standort der Gewerbeberechtigung: Gumpendorfer Straße 127, 1060 Wien'
					. '<br>Firmenbuchnummer: ' . $fill( 'FN, nur falls im Firmenbuch eingetragen, sonst Zeile löschen' )
					. '<br>Firmensitz: Wien ' . $fill( 'nur falls im Firmenbuch eingetragen, sonst Zeile löschen' )
					. '<br>Firmenbuchgericht: Handelsgericht Wien ' . $fill( 'nur falls im Firmenbuch eingetragen, sonst Zeile löschen' )
					. '<br>UID-Nummer: ' . $fill( 'ATU-Nummer, nur falls vorhanden, sonst Zeile löschen' ),
				),
				array( 'h', 'Gewerbe' ),
				array(
					'p',
					'Unternehmensgegenstand: Friseur (Herrenfriseur, Barbershop)'
					. '<br>Gewerbe und Berufsbezeichnung: Friseur und Perückenmacher (Stylist), reglementiertes Gewerbe, verliehen in Österreich'
					. '<br>Gewerbebehörde: Magistratisches Bezirksamt für den 6. und 7. Bezirk, Hermanngasse 24-26, 1070 Wien'
					. '<br>Kammer: Mitglied der Wirtschaftskammer Wien, Sparte Gewerbe und Handwerk, Landesinnung Wien der Friseure'
					. '<br>Gewerberechtliche Vorschriften: Gewerbeordnung 1994 (GewO), abrufbar unter ' . $link( 'https://www.ris.bka.gv.at' ),
				),
				array( 'h', 'Preise' ),
				array( 'p', 'Alle Preise auf dieser Website sind Endpreise in Euro, inklusive einer allfälligen Umsatzsteuer; es kommen keine weiteren Kosten dazu.' ),
				array( 'h', 'Offenlegung nach § 25 MedienG' ),
				array(
					'p',
					'Medieninhaber: ' . $owner
					. '<br>Unternehmensgegenstand: Friseurbetrieb'
					. '<br>Wohnort beziehungsweise Sitz: ' . $fill( 'Wohnort des Inhabers, nur der Ort, zum Beispiel Wien' ),
				),
			)
		);

		$datenschutz = jos_legal_blocks(
			array(
				array( 'p', 'Der Schutz deiner Daten ist uns wichtig. Wir verarbeiten sie nach der Datenschutz-Grundverordnung (DSGVO), dem österreichischen Datenschutzgesetz (DSG) und dem Telekommunikationsgesetz 2021 (TKG 2021). Hier erfährst du, welche Daten diese Website verarbeitet, wozu, wie lange und welche Rechte du hast.' ),
				array( 'h', 'Verantwortlicher' ),
				array( 'p', $owner . '<br>Jo’s Barbershop<br>Gumpendorfer Straße 127<br>1060 Wien, Österreich<br>Telefon: ' . $fill( 'Telefonnummer' ) . '<br>E-Mail: ' . $fill( 'E-Mail-Adresse' ) ),
				array( 'p', 'Einen Datenschutzbeauftragten müssen wir nicht bestellen (Art. 37 DSGVO). Bei allen Fragen zum Datenschutz erreichst du uns unter der E-Mail-Adresse oben.' ),
				array( 'h', 'Besuch dieser Website' ),
				array( 'p', 'Bei jedem Aufruf einer Seite speichert der Server unseres Hosting-Anbieters automatisch folgende Daten in Protokolldateien: deine IP-Adresse, Datum und Uhrzeit, die aufgerufene Seite, den Statuscode, die übertragene Datenmenge, die zuvor besuchte Seite und deinen Browser mit Betriebssystem.' ),
				array( 'p', 'Zweck: die Website technisch ausliefern, sie stabil und sicher betreiben, Angriffe und Missbrauch erkennen und abwehren, Fehler finden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in genau diesen Zwecken. Ohne diese Daten kann die Website nicht ausgeliefert werden.' ),
				array( 'p', 'Speicherdauer: Der Hosting-Anbieter löscht die Protokolle nach ' . $fill( 'Anzahl Tage laut Hosting-Anbieter' ) . ' Tagen automatisch. Länger bleiben sie nur gespeichert, wenn ein konkreter Sicherheitsvorfall aufgeklärt werden muss, und dann nur bis zu dessen Abschluss.' ),
				array( 'h', 'Kontaktformular, E-Mail und Telefon' ),
				array( 'p', 'Wenn du uns über das Kontaktformular schreibst, verarbeiten wir deinen Namen, deine E-Mail-Adresse, deine Nachricht, die Sprache der Seite sowie Datum und Uhrzeit. Die Website selbst speichert davon nichts: Die Angaben gehen als E-Mail an unser Postfach. Schreibst du uns direkt eine E-Mail oder rufst du an, verarbeiten wir deine Angaben auf dieselbe Weise und zum selben Zweck; bei einem Anruf nur das, was wir uns zu deiner Anfrage notieren.' ),
				array( 'p', 'Zweck: deine Anfrage beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn es um einen Termin, einen Preis oder eine Leistung geht, sonst Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist, Anfragen an uns in deiner Sprache zu beantworten. Deine Angaben sind freiwillig; ohne deinen Namen, deine E-Mail-Adresse und deine Nachricht können wir dir aber nicht antworten.' ),
				array( 'p', 'Gegen Spam hat das Formular ein für Menschen unsichtbares Feld und eine Mindestzeit zum Ausfüllen (Art. 6 Abs. 1 lit. f DSGVO, unser Interesse, Spam und Missbrauch abzuwehren). Dafür werden keine weiteren Daten erhoben, nichts auf deinem Gerät gespeichert und kein fremder Dienst eingesetzt.' ),
				array( 'p', 'Speicherdauer: Wir löschen deine Nachricht, sobald deine Anfrage erledigt ist, spätestens ' . $fill( '6 Monate' ) . ' nach unserem letzten Kontakt. Länger bewahren wir sie nur auf, wenn sie steuerlich relevant ist, etwa zu einer Rechnung (sieben Jahre, Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit § 132 Bundesabgabenordnung (BAO)), oder wenn wir sie zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen brauchen, bis diese erledigt sind (Art. 17 Abs. 3 lit. e DSGVO).' ),
				array( 'h', 'Termine über Treatwell' ),
				array( 'p', 'Die Buttons „Reservierung“ und „Termin buchen“ sind einfache Links zu unserer Buchungsseite bei Treatwell. Buchst du dort, gelten für deine Angaben die Datenschutzbestimmungen von Treatwell. Wir erhalten von Treatwell die Angaben zu deinem Termin (Name, Kontaktdaten, Leistung, Zeit), damit wir den Termin wahrnehmen können (Art. 6 Abs. 1 lit. b DSGVO).' ),
				array( 'p', 'Speicherdauer: Die Angaben zu deinem Termin löschen wir spätestens ' . $fill( '6 Monate' ) . ' nach dem Termin. Länger bewahren wir sie nur auf, wenn sie zu einer Rechnung gehören (sieben Jahre, Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit § 132 BAO), oder wenn wir sie zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen brauchen, bis diese erledigt sind (Art. 17 Abs. 3 lit. e DSGVO).' ),
				array( 'h', 'Keine Cookies, kein Tracking' ),
				array( 'p', 'Diese Website setzt für Besucher keine Cookies und verwendet keine vergleichbaren Techniken (zum Beispiel Local Storage, Session Storage, Tracking-Pixel oder Fingerprinting). Es wird nichts auf deinem Gerät gespeichert oder aus ihm ausgelesen (§ 165 Abs. 3 TKG 2021). Es gibt keine Webanalyse, kein Tracking, keine Werbung, keine Social-Media-Plugins und keine eingebetteten Inhalte anderer Anbieter. Deshalb brauchen wir keine Einwilligung und zeigen kein Cookie-Banner.' ),
				array( 'p', 'Die Website lädt keine Schriften nach, sie verwendet die Standardschriften deines Geräts. Skripte und Bilder werden alle von unserem eigenen Server geladen. Nur wer sich im Verwaltungsbereich von WordPress anmeldet (wir selbst), bekommt dort die dafür technisch notwendigen Anmelde-Cookies.' ),
				array( 'h', 'Links zu anderen Anbietern' ),
				array( 'p', 'Unsere Website enthält einfache Links zu anderen Anbietern: zur Terminbuchung bei Treatwell, zur Adresse bei Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) und zur Website unserer Webagentur. Beim bloßen Besuch unserer Website wird nichts an diese Anbieter übermittelt. Erst wenn du einen Link anklickst, verbindet sich dein Browser mit dem jeweiligen Anbieter; der erhält dann deine IP-Adresse und technische Daten und ist dafür selbst verantwortlich. Es gelten seine Datenschutzbestimmungen.' ),
				array( 'h', 'Empfänger und Drittländer' ),
				array( 'p', 'Nur die folgenden Dienstleister erhalten deine Daten. Alle sind Auftragsverarbeiter mit einem Vertrag nach Art. 28 DSGVO und verarbeiten deine Daten nur nach unseren Weisungen:' ),
				array(
					'ul',
					array(
						'Hosting der Website: ' . $fill( 'Name und Sitz des Hosting-Anbieters' ),
						'E-Mail-Postfach: ' . $fill( 'Name und Sitz des E-Mail-Anbieters' ),
						'Wartung der Website: ' . $fill( 'Name und Sitz der Webagentur, nur falls sie Zugriff auf die Website hat, sonst Zeile löschen' ),
					),
				),
				array( 'p', 'Wir verkaufen keine Daten und geben sie nicht für Werbung weiter. Eine Übermittlung in Länder außerhalb der EU und des EWR findet nicht statt. ' . $fill( 'Nur richtig, wenn alle Dienstleister oben in der EU oder im EWR verarbeiten, sonst anpassen' ) ),
				array( 'h', 'Deine Rechte' ),
				array( 'p', 'Du hast das Recht auf:' ),
				array(
					'ul',
					array(
						'Auskunft über deine Daten (Art. 15 DSGVO)',
						'Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
						'Löschung (Art. 17 DSGVO)',
						'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
						'Datenübertragbarkeit (Art. 20 DSGVO)',
					),
				),
				array( 'p', 'Schreib uns dazu einfach an die E-Mail-Adresse oben.' ),
				array( 'h', 'Dein Widerspruchsrecht' ),
				array( 'p', 'Verarbeiten wir deine Daten auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO), kannst du dieser Verarbeitung aus Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO). Dann verarbeiten wir deine Daten nicht mehr, außer wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die deine Interessen, Rechte und Freiheiten überwiegen, oder wir brauchen die Daten zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.' ),
				array( 'h', 'Beschwerde' ),
				array( 'p', 'Wenn du meinst, dass wir deine Daten nicht richtig verarbeiten, kannst du dich bei der Aufsichtsbehörde beschweren (Art. 77 DSGVO): Österreichische Datenschutzbehörde, ' . $dsb . ', Telefon +43 1 52 152-0, E-Mail ' . $link( 'mailto:dsb@dsb.gv.at', 'dsb@dsb.gv.at' ) . ', ' . $link( 'https://www.dsb.gv.at' ) . '.' ),
				array( 'h', 'Keine automatisierten Entscheidungen' ),
				array( 'p', 'Wir treffen keine automatisierten Entscheidungen und erstellen keine Profile (Art. 22 DSGVO).' ),
				array( 'p', 'Stand: Oktober 2026' ),
			)
		);

		return array(
			'impressum'   => $impressum,
			'datenschutz' => $datenschutz,
		);
	}

	// English: a translation, the German text is the binding one
	$owner = $fill( 'first and last name of the owner, for an e.U. the company name as registered' );

	$impressum = jos_legal_blocks(
		array(
			array( 'p', 'Information under § 5 E-Commerce Act (ECG), § 63 Trade, Commerce and Industry Regulation Act (GewO) or § 14 Business Code (UGB), and disclosure under § 25 Media Act (MedienG). This English version is a translation; the German version is legally binding.' ),
			array( 'h', 'Service provider and media owner' ),
			array( 'p', $owner . '<br>Jo’s Barbershop<br>Gumpendorfer Straße 127<br>1060 Vienna, Austria' ),
			array( 'h', 'Contact' ),
			array( 'p', 'Phone: ' . $fill( 'phone number' ) . '<br>E-mail: ' . $fill( 'e-mail address' ) ),
			array( 'h', 'Company' ),
			array(
				'p',
				'Legal form: ' . $fill( 'sole proprietorship, or registered sole proprietorship (e.U.) if registered in the commercial register' )
				. '<br>Location of the trade licence: Gumpendorfer Straße 127, 1060 Vienna'
				. '<br>Commercial register number: ' . $fill( 'FN, only if registered in the commercial register, otherwise delete this line' )
				. '<br>Registered seat: Vienna ' . $fill( 'only if registered in the commercial register, otherwise delete this line' )
				. '<br>Commercial register court: Commercial Court Vienna (Handelsgericht Wien) ' . $fill( 'only if registered in the commercial register, otherwise delete this line' )
				. '<br>VAT number: ' . $fill( 'ATU number, only if there is one, otherwise delete this line' ),
			),
			array( 'h', 'Trade' ),
			array(
				'p',
				'Business purpose: hairdresser (men’s hairdresser, barbershop)'
				. '<br>Trade and professional title: Friseur und Perückenmacher (Stylist), a regulated trade, conferred in Austria'
				. '<br>Trade authority: Magistratisches Bezirksamt für den 6. und 7. Bezirk, Hermanngasse 24-26, 1070 Vienna'
				. '<br>Chamber: member of the Vienna Economic Chamber (Wirtschaftskammer Wien), Crafts and Trades Division, Landesinnung Wien der Friseure'
				. '<br>Trade regulations: Trade, Commerce and Industry Regulation Act 1994 (GewO), available at ' . $link( 'https://www.ris.bka.gv.at' ),
			),
			array( 'h', 'Prices' ),
			array( 'p', 'All prices on this website are final prices in euro, including any VAT; no further costs are added.' ),
			array( 'h', 'Disclosure under § 25 MedienG' ),
			array(
				'p',
				'Media owner: ' . $owner
				. '<br>Business purpose: hair salon'
				. '<br>Place of residence or registered office: ' . $fill( 'place of residence of the owner, only the town, for example Vienna' ),
			),
		)
	);

	$datenschutz = jos_legal_blocks(
		array(
			array( 'p', 'Protecting your data matters to us. We process it under the General Data Protection Regulation (GDPR), the Austrian Data Protection Act (DSG) and the Telecommunications Act 2021 (TKG 2021). Here you can read which data this website processes, why, for how long, and which rights you have. This English version is a translation; the German version is legally binding.' ),
			array( 'h', 'Controller' ),
			array( 'p', $owner . '<br>Jo’s Barbershop<br>Gumpendorfer Straße 127<br>1060 Vienna, Austria<br>Phone: ' . $fill( 'phone number' ) . '<br>E-mail: ' . $fill( 'e-mail address' ) ),
			array( 'p', 'We are not required to appoint a data protection officer (Art. 37 GDPR). For any question about data protection, write to the e-mail address above.' ),
			array( 'h', 'Visiting this website' ),
			array( 'p', 'Every time a page is requested, the server of our hosting provider automatically stores the following data in log files: your IP address, the date and time, the requested page, the status code, the amount of data transferred, the previously visited page and your browser and operating system.' ),
			array( 'p', 'Purpose: delivering the website, running it in a stable and secure way, detecting and stopping attacks and misuse, finding errors. The legal basis is Art. 6(1)(f) GDPR; our legitimate interest lies in exactly these purposes. Without this data the website cannot be delivered.' ),
			array( 'p', 'Retention: the hosting provider deletes the logs automatically after ' . $fill( 'number of days set by the hosting provider' ) . ' days. They are kept longer only if a specific security incident has to be investigated, and then only until the investigation is closed.' ),
			array( 'h', 'Contact form, e-mail and phone' ),
			array( 'p', 'When you write to us through the contact form, we process your name, your e-mail address, your message, the language of the page and the date and time. The website itself stores none of it: the details are sent as an e-mail to our mailbox. If you e-mail or call us directly, we process your details in the same way and for the same purpose; for a call, only what we note down about your request.' ),
			array( 'p', 'Purpose: answering your request. The legal basis is Art. 6(1)(b) GDPR when it is about an appointment, a price or a service, otherwise Art. 6(1)(f) GDPR; our legitimate interest is answering requests sent to us in your language. Providing your details is voluntary; however, without your name, e-mail address and message we cannot reply to you.' ),
			array( 'p', 'To prevent spam, the form uses a field that is invisible to people and a minimum time for filling it in (Art. 6(1)(f) GDPR, our interest in preventing spam and misuse). No further data is collected for this, nothing is stored on your device and no outside service is used.' ),
			array( 'p', 'Retention: we delete your message once your request has been dealt with, at the latest ' . $fill( '6 months' ) . ' after our last contact. We keep it longer only if it is relevant for tax purposes, for example in connection with an invoice (seven years, Art. 6(1)(c) GDPR in conjunction with § 132 Federal Fiscal Code (BAO)), or if we need it to establish, exercise or defend legal claims, until they are settled (Art. 17(3)(e) GDPR).' ),
			array( 'h', 'Appointments through Treatwell' ),
			array( 'p', 'The “Reservation” and “Book an appointment” buttons are plain links to our booking page on Treatwell. If you book there, Treatwell’s privacy policy applies to your details. We receive the details of your appointment from Treatwell (name, contact details, service, time) so we can keep the appointment (Art. 6(1)(b) GDPR).' ),
			array( 'p', 'Retention: we delete the details of your appointment at the latest ' . $fill( '6 months' ) . ' after the appointment. We keep them longer only if they belong to an invoice (seven years, Art. 6(1)(c) GDPR in conjunction with § 132 BAO), or if we need them to establish, exercise or defend legal claims, until they are settled (Art. 17(3)(e) GDPR).' ),
			array( 'h', 'No cookies, no tracking' ),
			array( 'p', 'This website sets no cookies for visitors and uses no similar techniques (for example local storage, session storage, tracking pixels or fingerprinting). Nothing is stored on or read from your device (§ 165(3) TKG 2021). There is no web analytics, no tracking, no advertising, no social media plugins and no embedded content of other providers. That is why we need no consent and show no cookie banner.' ),
			array( 'p', 'The website loads no fonts; it uses the standard fonts of your device. Scripts and images are all loaded from our own server. Only those who log in to the WordPress admin area (that is, we ourselves) receive the login cookies that are technically necessary there.' ),
			array( 'h', 'Links to other providers' ),
			array( 'p', 'Our website contains plain links to other providers: to appointment booking on Treatwell, to our address on Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland) and to the website of our web agency. Merely visiting our website sends nothing to these providers. Only when you click a link does your browser connect to that provider; it then receives your IP address and technical data and is itself responsible for them. Its privacy policy applies.' ),
			array( 'h', 'Recipients and third countries' ),
			array( 'p', 'Only the following service providers receive your data. All of them are processors bound by a contract under Art. 28 GDPR and process your data only on our instructions:' ),
			array(
				'ul',
				array(
					'Hosting of the website: ' . $fill( 'name and seat of the hosting provider' ),
					'E-mail mailbox: ' . $fill( 'name and seat of the e-mail provider' ),
					'Maintenance of the website: ' . $fill( 'name and seat of the web agency, only if it has access to the website, otherwise delete this line' ),
				),
			),
			array( 'p', 'We do not sell data and do not pass it on for advertising. No data is transferred to countries outside the EU and the EEA. ' . $fill( 'only true if all service providers above process in the EU or the EEA, otherwise adjust' ) ),
			array( 'h', 'Your rights' ),
			array( 'p', 'You have the right to:' ),
			array(
				'ul',
				array(
					'access your data (Art. 15 GDPR)',
					'rectification of incorrect data (Art. 16 GDPR)',
					'erasure (Art. 17 GDPR)',
					'restriction of processing (Art. 18 GDPR)',
					'data portability (Art. 20 GDPR)',
				),
			),
			array( 'p', 'Just write to the e-mail address above.' ),
			array( 'h', 'Your right to object' ),
			array( 'p', 'Where we process your data on the basis of our legitimate interest (Art. 6(1)(f) GDPR), you can object to this processing at any time on grounds relating to your particular situation (Art. 21 GDPR). We will then stop processing your data, unless we can demonstrate compelling legitimate grounds for the processing that override your interests, rights and freedoms, or we need the data to establish, exercise or defend legal claims.' ),
			array( 'h', 'Complaint' ),
			array( 'p', 'If you believe we do not process your data correctly, you can lodge a complaint with the supervisory authority (Art. 77 GDPR): Austrian Data Protection Authority (Österreichische Datenschutzbehörde), Barichgasse 40-42, 1030 Vienna, phone +43 1 52 152-0, e-mail ' . $link( 'mailto:dsb@dsb.gv.at', 'dsb@dsb.gv.at' ) . ', ' . $link( 'https://www.dsb.gv.at' ) . '.' ),
			array( 'h', 'No automated decisions' ),
			array( 'p', 'We make no automated decisions and create no profiles (Art. 22 GDPR).' ),
			array( 'p', 'Last updated: October 2026' ),
		)
	);

	return array(
		'impressum'   => $impressum,
		'datenschutz' => $datenschutz,
	);
}

/**
 * Impressum and Datenschutz with their first texts (jos_legal_texts_in()), in every language: a page is filled
 * only while it is empty or still holds just "Inhalt folgt."; a missing page is made. It runs once on the first
 * visit after JOS_LEGAL_FILL, no login needed.
 */
function jos_fill_legal(): void {
	if ( JOS_LEGAL_FILL === get_option( 'jos_legal_fill' ) ) {
		return;
	}
	$strings = jos_strings();
	$titles  = array(
		'impressum'   => 'Impressum',
		'datenschutz' => 'Datenschutz',
	);
	foreach ( array_keys( jos_languages() ) as $lang ) {
		foreach ( jos_legal_texts_in( $lang ) as $slug => $text ) {
			$page = get_page_by_path( jos_legal_page( $slug, $lang ) );
			if ( ! $page ) {
				jos_save_page(
					array(
						'post_type'    => 'page',
						'post_status'  => 'publish',
						'post_title'   => 'de' === $lang ? $titles[ $slug ] : ( $strings[ $lang ][ $titles[ $slug ] ] ?? $titles[ $slug ] ),
						'post_name'    => jos_legal_page( $slug, $lang ),
						'post_content' => $text,
					)
				);
			} elseif ( jos_is_placeholder( $page->post_content ) ) {
				jos_save_page(
					array(
						'ID'           => $page->ID,
						'post_content' => $text,
					)
				);
			}
		}
	}
	update_option( 'jos_legal_fill', JOS_LEGAL_FILL, false );
}
add_action( 'init', 'jos_fill_legal', 30 );
