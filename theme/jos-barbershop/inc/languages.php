<?php
/**
 * Languages of the site: German (the default) and English.
 * The language is in the address: no parameter = German, ?lang=en. The pages behind the arches and the legal
 * pages exist once per language (leistungen, leistungen-en, impressum, impressum-en, ...), the short texts of
 * the theme are translated in jos_strings().
 *
 * @package jos-barbershop
 */

/**
 * The languages, in the order of the language menu.
 *
 * @return array<string, array{label: string, name: string, locale: string}>
 */
function jos_languages(): array {
	return array(
		'de' => array(
			'label'  => 'DE',
			'name'   => 'Deutsch',
			'locale' => 'de-AT',
		),
		'en' => array(
			'label'  => 'EN',
			'name'   => 'English',
			'locale' => 'en',
		),
	);
}

/**
 * Language of this request.
 */
function jos_lang(): string {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only chooses the language of the page.
	$lang = isset( $_GET['lang'] ) ? sanitize_key( wp_unslash( $_GET['lang'] ) ) : 'de';
	return array_key_exists( $lang, jos_languages() ) ? $lang : 'de';
}

/**
 * An address of the site in the language of this request (or in the given one).
 *
 * @param string      $url  Address of the site.
 * @param string|null $lang Language, default the language of this request.
 */
function jos_url( string $url, ?string $lang = null ): string {
	$lang = $lang ?? jos_lang();
	return 'de' === $lang ? remove_query_arg( 'lang', $url ) : add_query_arg( 'lang', $lang, $url );
}

/**
 * The front page in every language, for the language menu.
 *
 * @return array<int, array{code: string, label: string, name: string, url: string, current: bool}>
 */
function jos_language_links(): array {
	$links = array();
	foreach ( jos_languages() as $code => $language ) {
		$links[] = array(
			'code'    => $code,
			'label'   => $language['label'],
			'name'    => $language['name'],
			'url'     => jos_url( home_url( '/' ), $code ),
			'current' => jos_lang() === $code,
		);
	}
	return $links;
}

/**
 * Short texts of the theme in the language of this request; the German text is the key.
 *
 * @param string $de German text.
 */
function jos_t( string $de ): string {
	$strings = jos_strings();
	$lang    = jos_lang();
	return isset( $strings[ $lang ][ $de ] ) ? $strings[ $lang ][ $de ] : $de;
}

/**
 * English for the short texts of the theme. The slogan keeps the spelling of the shop window: confidense.
 *
 * @return array<string, array<string, string>>
 */
function jos_strings(): array {
	return array(
		'en' => array(
			'dein Selbstbewusstsein beginnt hier'      => 'your confidense starts here',
			'BARBERSHOP in 1060 WIEN'                  => 'BARBERSHOP in 1060 VIENNA',
			'Zum Inhalt'                               => 'Skip to content',
			'Hauptmenü'                                => 'Main menu',
			'Sprache'                                  => 'Language',
			'Termin buchen'                            => 'Book an appointment',
			'Reservierung'                             => 'Reservation',
			'Schreib uns'                              => 'Write to us',
			'Name'                                     => 'Name',
			'E-Mail'                                   => 'Email',
			'Nachricht'                                => 'Message',
			'Senden'                                   => 'Send',
			'Wird gesendet'                            => 'Sending',
			'Deine Angaben verwenden wir nur, um dir zu antworten.' => 'We use your details only to reply to you.',
			'Danke!'                                   => 'Thank you!',
			'Deine Nachricht ist angekommen. Wir melden uns bald.' => 'Your message has arrived. We will get back to you soon.',
			'Neue Nachricht'                           => 'New message',
			'Bitte fülle alle Felder aus.'             => 'Please fill in all fields.',
			'Bitte gib eine gültige E-Mail-Adresse ein.' => 'Please enter a valid email address.',
			'Die Seite war zu lange offen. Bitte lade sie neu und sende noch einmal.' => 'The page was open too long. Please reload it and send again.',
			'Die Nachricht konnte nicht gesendet werden. Bitte versuch es später noch einmal.' => 'The message could not be sent. Please try again later.',
			'Seite bearbeiten'                         => 'Edit page',
			'Seite mit der Adresse "%s" anlegen'       => 'Create a page with the address "%s"',
			'Ziehen, um sich umzusehen'                => 'Drag to look around',
			'Zurück auf die Straße'                    => 'Back to the street',
			'Rechtliches'                              => 'Legal',
			'Impressum'                                => 'Imprint',
			'Datenschutz'                              => 'Privacy',
			'Cookies'                                  => 'Cookies',
			'Häufige Fragen'                           => 'FAQ',
			'Leistungen & Preise'                      => 'Services & Prices',
			'Leistungen'                               => 'Services',
			'Über uns'                                 => 'About us',
			'Galerie'                                  => 'Gallery',
			'Kontakt'                                  => 'Contact',
			'Inhalt folgt.'                            => 'Content follows.',
			'Alle Rechte vorbehalten'                  => 'All rights reserved',
			'Erstellt von'                             => 'Made by',
			'Di-Fr 10-19 Uhr'                          => 'Tue-Fri 10-19',
			'Sa 10-18 Uhr'                             => 'Sat 10-18',
			'So&Mo geschlossen'                        => 'Sun&Mon closed',
		),
	);
}

/**
 * <html lang="..."> in the language of this request.
 */
function jos_language_attributes(): string {
	return sprintf( 'lang="%s"', esc_attr( jos_languages()[ jos_lang() ]['locale'] ) );
}
add_filter( 'language_attributes', 'jos_language_attributes' );

/**
 * The front page in the other languages, for search engines.
 */
function jos_hreflang(): void {
	if ( ! is_front_page() ) {
		return;
	}
	foreach ( jos_language_links() as $link ) {
		printf( '<link rel="alternate" hreflang="%1$s" href="%2$s">' . "\n", esc_attr( jos_languages()[ $link['code'] ]['locale'] ), esc_url( $link['url'] ) );
	}
	printf( '<link rel="alternate" hreflang="x-default" href="%s">' . "\n", esc_url( jos_url( home_url( '/' ), 'de' ) ) );
}
add_action( 'wp_head', 'jos_hreflang' );
