<?php
/**
 * Languages of the site: German (the default), English and Arabic (right to left).
 * The language is in the address: no parameter = German, ?lang=en, ?lang=ar. The pages behind the arches
 * exist once per language (leistungen, leistungen-en, leistungen-ar, ...), the short texts of the theme
 * are translated in jos_strings().
 *
 * @package jos-barbershop
 */

/**
 * The languages, in the order of the language menu.
 *
 * @return array<string, array{label: string, name: string, locale: string, dir: string}>
 */
function jos_languages(): array {
	return array(
		'de' => array(
			'label'  => 'DE',
			'name'   => 'Deutsch',
			'locale' => 'de-AT',
			'dir'    => 'ltr',
		),
		'en' => array(
			'label'  => 'EN',
			'name'   => 'English',
			'locale' => 'en',
			'dir'    => 'ltr',
		),
		'ar' => array(
			'label'  => 'AR',
			'name'   => 'العربية',
			'locale' => 'ar',
			'dir'    => 'rtl',
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
 * English and Arabic for the short texts of the theme.
 *
 * @return array<string, array<string, string>>
 */
function jos_strings(): array {
	return array(
		'en' => array(
			'Zum Inhalt'                  => 'Skip to content',
			'Hauptmenü'                   => 'Main menu',
			'Sprache'                     => 'Language',
			'Termin buchen'               => 'Book an appointment',
			'Barbershop in 1060 Wien'     => 'Barbershop in 1060 Vienna',
			'Ziehen, um sich umzusehen'   => 'Drag to look around',
			'Zurück auf die Straße'       => 'Back to the street',
			'Rechtliches'                 => 'Legal',
			'Impressum'                   => 'Imprint',
			'Datenschutz'                 => 'Privacy',
			'Leistungen & Preise'         => 'Services & Prices',
			'Leistungen'                  => 'Services',
			'Über uns'                    => 'About us',
			'Galerie'                     => 'Gallery',
			'Kontakt'                     => 'Contact',
			'Inhalt folgt.'               => 'Content follows.',
		),
		'ar' => array(
			'Zum Inhalt'                  => 'انتقل إلى المحتوى',
			'Hauptmenü'                   => 'القائمة الرئيسية',
			'Sprache'                     => 'اللغة',
			'Termin buchen'               => 'احجز موعدًا',
			'Barbershop in 1060 Wien'     => 'صالون حلاقة في فيينا 1060',
			'Ziehen, um sich umzusehen'   => 'اسحب لتنظر حولك',
			'Zurück auf die Straße'       => 'العودة إلى الشارع',
			'Rechtliches'                 => 'معلومات قانونية',
			'Impressum'                   => 'بيانات الناشر',
			'Datenschutz'                 => 'الخصوصية',
			'Leistungen & Preise'         => 'الخدمات والأسعار',
			'Leistungen'                  => 'الخدمات',
			'Über uns'                    => 'من نحن',
			'Galerie'                     => 'المعرض',
			'Kontakt'                     => 'اتصل بنا',
			'Inhalt folgt.'               => 'المحتوى قريبًا.',
		),
	);
}

/**
 * <html lang="..." dir="..."> in the language of this request.
 */
function jos_language_attributes(): string {
	$language = jos_languages()[ jos_lang() ];
	return sprintf( 'lang="%s"%s', esc_attr( $language['locale'] ), 'rtl' === $language['dir'] ? ' dir="rtl"' : '' );
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
