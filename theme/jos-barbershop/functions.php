<?php
/**
 * Jo's Barbershop theme.
 *
 * @package jos-barbershop
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'JOS_VERSION', '0.11.9' );

require_once get_template_directory() . '/inc/languages.php';

/**
 * Theme supports.
 */
function jos_setup(): void {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'script', 'style', 'navigation-widgets' ) );
	load_theme_textdomain( 'jos-barbershop', get_template_directory() . '/languages' );
}
add_action( 'after_setup_theme', 'jos_setup' );

/**
 * Styles.
 */
function jos_enqueue_styles(): void {
	wp_enqueue_style( 'jos-style', get_stylesheet_uri(), array(), filemtime( get_template_directory() . '/style.css' ) );
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_styles' );

/**
 * Favicon: the sign of the shop, the white "Jo's" of the logo (logo/jos-barbershop-logo-transparent.svg, without
 * BARBERSHOP, its letters slightly thickened so they read at 16 px) on a black disc. favicon.ico (16, 32, 48 px)
 * for every browser, favicon.svg for the ones that take it, apple-touch-icon.png (180 px, on the paper) for
 * phones. A site icon set in WordPress (Customizer, Website-Information) takes its place.
 */
function jos_favicon(): void {
	if ( has_site_icon() ) {
		return;
	}
	printf( '<link rel="icon" href="%s" sizes="32x32">' . "\n", esc_url( jos_image( 'favicon.ico' ) ) );
	printf( '<link rel="icon" href="%s" type="image/svg+xml">' . "\n", esc_url( jos_image( 'favicon.svg' ) ) );
	printf( '<link rel="apple-touch-icon" href="%s">' . "\n", esc_url( jos_image( 'apple-touch-icon.png' ) ) );
}
add_action( 'wp_head', 'jos_favicon', 2 );

/**
 * GSAP and the motion layer (the way through the arches into the pages), all local, in the footer.
 */
function jos_enqueue_motion(): void {
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_enqueue_script( 'gsap', $dir . '/vendor/gsap.min.js', array(), '3.15.0', true );
	wp_enqueue_script( 'jos-motion', $dir . '/motion.js', array( 'gsap' ), filemtime( $path . '/motion.js' ), true );
	if ( is_front_page() ) {
		wp_enqueue_script( 'jos-vines', $dir . '/vines.js', array( 'gsap' ), filemtime( $path . '/vines.js' ), true );
	}
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_motion' );

/**
 * three.js scene of the hero, loaded as ES module through the Script Modules API (importmap for 'three'
 * and for the facade lines, so a changed facade.js gets a new version in its address too).
 */
function jos_enqueue_scene(): void {
	if ( ! is_front_page() ) {
		return;
	}
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_register_script_module( 'three', $dir . '/vendor/three.module.min.js', array(), '0.186.1' );
	wp_register_script_module( 'jos-facade', $dir . '/facade.js', array(), filemtime( $path . '/facade.js' ) );
	wp_enqueue_script_module( 'jos-scene', $dir . '/scene.js', array( 'three', 'jos-facade' ), filemtime( $path . '/scene.js' ) );
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_scene' );

/**
 * True on the local development copy (LocalWP), never on the live site.
 */
function jos_is_local(): bool {
	$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
	return in_array( wp_get_environment_type(), array( 'local', 'development' ), true )
		|| in_array( $host, array( 'localhost', '127.0.0.1' ), true )
		|| str_ends_with( $host, '.local' );
}

/**
 * Newest change of any file of the theme, as a number. The local page asks for it every two seconds.
 */
function jos_theme_stamp(): int {
	$newest = 0;
	$files  = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( get_template_directory(), FilesystemIterator::SKIP_DOTS ) );
	foreach ( $files as $file ) {
		$newest = max( $newest, $file->getMTime() );
	}
	return $newest;
}

/**
 * Local only: the page reloads by itself when the sync has copied new theme files into Local.
 */
function jos_dev_reload(): void {
	if ( ! jos_is_local() ) {
		return;
	}
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_enqueue_script( 'jos-dev-reload', $dir . '/dev-reload.js', array(), filemtime( $path . '/dev-reload.js' ), true );
	wp_localize_script( 'jos-dev-reload', 'josDevReload', array( 'url' => esc_url_raw( rest_url( 'jos/v1/stamp' ) ) ) );
}
add_action( 'wp_enqueue_scripts', 'jos_dev_reload' );

/**
 * Local only: REST address that answers with jos_theme_stamp().
 */
function jos_dev_reload_route(): void {
	if ( ! jos_is_local() ) {
		return;
	}
	register_rest_route(
		'jos/v1',
		'/stamp',
		array(
			'methods'             => 'GET',
			'callback'            => static fn() => array( 'stamp' => jos_theme_stamp() ),
			'permission_callback' => '__return_true',
		)
	);
}
add_action( 'rest_api_init', 'jos_dev_reload_route' );

/**
 * Customizer: link of the booking button (booking page or tel: link).
 *
 * @param WP_Customize_Manager $wp_customize Customizer.
 */
function jos_customize_register( WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_section(
		'jos_contact',
		array(
			'title'    => __( 'Jo\'s Barbershop', 'jos-barbershop' ),
			'priority' => 30,
		)
	);
	$wp_customize->add_setting(
		'jos_booking_link',
		array(
			'default'           => '',
			'sanitize_callback' => 'jos_sanitize_link',
		)
	);
	$wp_customize->add_control(
		'jos_booking_link',
		array(
			'label'       => __( 'Termin-Link', 'jos-barbershop' ),
			'description' => __( 'Buchungsseite (https://...) oder Telefon (tel:+43...).', 'jos-barbershop' ),
			'section'     => 'jos_contact',
			'type'        => 'text',
		)
	);
	$wp_customize->add_setting(
		'jos_phone',
		array(
			'default'           => '',
			'sanitize_callback' => 'jos_sanitize_phone',
		)
	);
	$wp_customize->add_control(
		'jos_phone',
		array(
			'label'       => __( 'Telefon', 'jos-barbershop' ),
			'description' => __( 'Steht im Footer (z. B. +43 1 234 56 78).', 'jos-barbershop' ),
			'section'     => 'jos_contact',
			'type'        => 'text',
		)
	);
}
add_action( 'customize_register', 'jos_customize_register' );

/**
 * Keeps only what a phone number is made of.
 *
 * @param string $value Typed number.
 */
function jos_sanitize_phone( string $value ): string {
	return trim( (string) preg_replace( '/[^0-9+ \/()-]/', '', $value ) );
}

/**
 * Phone number of the shop from the Customizer, and the same as a tel: address.
 *
 * @return array{text: string, url: string}
 */
function jos_phone(): array {
	$text = (string) get_theme_mod( 'jos_phone', '' );
	return array(
		'text' => $text,
		'url'  => $text ? 'tel:' . preg_replace( '/[^0-9+]/', '', $text ) : '',
	);
}

/**
 * Allows https and tel links only.
 *
 * @param string $value Raw value.
 */
function jos_sanitize_link( string $value ): string {
	return esc_url_raw( trim( $value ), array( 'https', 'http', 'tel' ) );
}

/**
 * Reservation button of the hero (after a button on Uiverse.io by MuhammadHasann): green, the three plants of
 * images/plants.svg hang over its top edge and sway while it is pointed at (vines.js). It leads to the booking
 * link of the Customizer (a booking page in a new tab); until that is set, to the contact page behind its arch.
 */
function jos_reservation_button(): void {
	$link   = (string) get_theme_mod( 'jos_booking_link', '' );
	$sprite = jos_image( 'plants.svg' );
	// the plants as on the Uiverse button: symbol, its viewBox
	$plants = array(
		array( 0, '0 0 26.3 65.33' ),
		array( 1, '0 0 11.67 37.63' ),
		array( 2, '0 0 25.29 76.92' ),
	);
	$html = '';
	foreach ( $plants as $index => $plant ) {
		$html .= sprintf(
			'<span class="reserve__plant reserve__plant--%1$d" data-plant aria-hidden="true"><svg viewBox="%2$s" focusable="false"><use href="%3$s"></use></svg></span>',
			$index + 1,
			esc_attr( $plant[1] ),
			esc_url( $sprite ) . '#plant-' . $plant[0]
		);
	}
	printf(
		'<a class="reserve" href="%1$s"%2$s data-reserve><span class="reserve__label">%3$s</span>%4$s</a>',
		esc_url( $link ? $link : '#kontakt', array( 'https', 'http', 'tel' ) ),
		0 === strpos( $link, 'http' ) ? ' target="_blank" rel="noopener"' : '',
		esc_html( jos_t( 'Reservierung' ) ),
		$html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	);
}

/**
 * Booking button. Without a link only logged in editors see a hint where to set it.
 */
function jos_booking_button(): void {
	$link = get_theme_mod( 'jos_booking_link', '' );
	if ( $link ) {
		printf(
			'<a class="button" href="%1$s" data-reveal>%2$s</a>',
			esc_url( $link, array( 'https', 'http', 'tel' ) ),
			esc_html( jos_t( 'Termin buchen' ) )
		);
	} elseif ( current_user_can( 'customize' ) ) {
		printf(
			'<a class="button button--hint" href="%1$s" data-reveal>%2$s</a>',
			esc_url( admin_url( 'customize.php?autofocus[control]=jos_booking_link' ) ),
			esc_html( jos_t( 'Termin-Link im Customizer eintragen' ) )
		);
	}
}

/**
 * Image files of the theme.
 *
 * @param string $file File name in assets/images.
 */
function jos_image( string $file ): string {
	$path = get_template_directory() . '/assets/images/' . $file;
	$url  = get_template_directory_uri() . '/assets/images/' . $file;
	// the time of the last change in the address: a changed image is loaded fresh, not from the cache
	return file_exists( $path ) ? add_query_arg( 'ver', filemtime( $path ), $url ) : $url;
}

/**
 * Image file of the theme, or an empty string while the file is not there yet.
 *
 * @param string $file File name in assets/images.
 */
function jos_image_if_exists( string $file ): string {
	return file_exists( get_template_directory() . '/assets/images/' . $file ) ? jos_image( $file ) : '';
}

/**
 * The shop: address, opening hours, payment and languages (04.10.2026). Used for the footer and the
 * HairSalon schema; the page Kontakt got the same at the start and is edited in WordPress from then on.
 *
 * @return array<string, mixed>
 */
function jos_shop(): array {
	return array(
		'name'      => 'Jo’s Barbershop',
		'street'    => 'Gumpendorfer Straße 127',
		'postcode'  => '1060',
		'city'      => 'Wien',
		'country'   => 'AT',
		'hours'     => array(
			array( array( 'Tuesday', 'Wednesday', 'Thursday', 'Friday' ), '10:00', '19:00' ),
			array( array( 'Saturday' ), '10:00', '18:00' ),
		),
		'payment'   => 'Cash, Credit Card',
		'languages' => array( 'de', 'en', 'ar', 'ku' ),
	);
}

/**
 * Google Maps search for the address of the shop (a plain link, nothing is embedded).
 */
function jos_maps_link(): string {
	$shop = jos_shop();
	return 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( $shop['name'] . ', ' . $shop['street'] . ', ' . $shop['postcode'] . ' ' . $shop['city'] );
}

/**
 * The footer in four columns, flush left. footer.php shows them as the footer; on the front page scene.js
 * also cuts them into the foundation of the facade, under the ground line, one line under the other.
 *   1. the small logo, © 2026 Jo's Barbershop, Alle Rechte vorbehalten, Erstellt von and the mark of
 *      die aigentur (a link to dieaigentur.at)
 *   2. the opening hours: Di-Fr 10-19 Uhr, Sa 10-18 Uhr, So&Mo geschlossen
 *   3. the menu: the pages, Impressum, Datenschutz, Cookies, FAQ
 *   4. Gumpendorfer Straße 127, 1060 Wien (both to Google Maps), phone (once it is in the Customizer)
 * Every item: text, and url (an address) or arch (a page behind an arch of the front page) for a link.
 *
 * @return array<int, array<int, array<string, mixed>>>
 */
function jos_footer_columns(): array {
	$shop  = jos_shop();
	$base  = is_front_page() ? '' : jos_url( home_url( '/' ) );
	$legal = static function ( string $slug ): string {
		$page = get_page_by_path( jos_legal_page( $slug ) );
		return $page ? jos_url( (string) get_permalink( $page ) ) : '';
	};
	$menu = array();
	foreach ( jos_rooms() as $room ) {
		$menu[] = array(
			'text' => $room['nav'],
			'url'  => $base . '#' . $room['slug'],
			'arch' => $room['arch'],
			'slug' => $room['slug'],
		);
	}
	foreach ( array(
		'Impressum'   => $legal( 'impressum' ),
		'Datenschutz' => $legal( 'datenschutz' ),
		'Cookies'     => $legal( 'cookies' ),
	) as $label => $url ) {
		if ( $url ) {
			$menu[] = array(
				'text' => jos_t( $label ),
				'url'  => $url,
			);
		}
	}
	$menu[] = array(
		'text' => jos_t( 'Häufige Fragen' ),
		'url'  => $base . '#faq',
		'slug' => 'faq',
	);

	$contact = array(
		array(
			'text' => $shop['street'],
			'url'  => jos_maps_link(),
		),
		array(
			'text' => $shop['postcode'] . ' ' . $shop['city'],
			'url'  => jos_maps_link(),
		),
	);
	$phone   = jos_phone();
	if ( $phone['text'] ) {
		$contact[] = array(
			'text' => $phone['text'],
			'url'  => $phone['url'],
		);
	}

	return array(
		array(
			array(
				'kind' => 'logo',
				'text' => $shop['name'],
			),
			array( 'text' => '© ' . wp_date( 'Y' ) . ' ' . $shop['name'] ),
			array( 'text' => jos_t( 'Alle Rechte vorbehalten' ) ),
			array(
				'kind'  => 'agency',
				'text'  => jos_t( 'Erstellt von' ),
				'label' => 'die aigentur',
				'url'   => 'https://dieaigentur.at/',
				'mark'  => jos_image( 'die-aigentur-mark.svg' ),
			),
		),
		array(
			array( 'text' => jos_t( 'Di-Fr 10-19 Uhr' ) ),
			array( 'text' => jos_t( 'Sa 10-18 Uhr' ) ),
			array( 'text' => jos_t( 'So&Mo geschlossen' ) ),
		),
		$menu,
		$contact,
	);
}

/**
 * The mark of die aigentur (assets/images/die-aigentur-mark.svg) for the footer, inline and in the colour of the
 * text: its own gold fill is taken out, the shapes take currentColor.
 */
function jos_agency_mark(): string {
	$file = get_template_directory() . '/assets/images/die-aigentur-mark.svg';
	if ( ! file_exists( $file ) ) {
		return 'die aigentur';
	}
	$svg = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a file of the theme.
	$svg = (string) preg_replace( array( '/<\?xml.*?\?>/s', '/<!--.*?-->/s', '/<style>.*?<\/style>/s', '/\sid="[^"]*"/' ), '', $svg );
	return trim( str_replace( '<svg ', '<svg aria-hidden="true" focusable="false" ', $svg ) );
}

/**
 * Address of a legal page in a language: impressum, impressum-en, ...
 *
 * @param string      $slug Address of the German page: impressum, datenschutz or cookies.
 * @param string|null $lang Language, default the language of this request.
 */
function jos_legal_page( string $slug, ?string $lang = null ): string {
	$lang = $lang ?? jos_lang();
	return 'de' === $lang ? $slug : $slug . '-' . $lang;
}

/**
 * Impressum, Datenschutz and Cookies as pages with "Inhalt folgt." in German and "Content follows." in English,
 * made once on the first visit of the site (by anyone, no login needed), so the footer always has these links;
 * their text is written in WordPress.
 */
function jos_create_legal_pages(): void {
	if ( JOS_VERSION === get_option( 'jos_legal_created' ) ) {
		return;
	}
	$strings = jos_strings();
	foreach ( array_keys( jos_languages() ) as $lang ) {
		$say = static fn( string $de ): string => 'de' === $lang ? $de : ( $strings[ $lang ][ $de ] ?? $de );
		foreach ( array(
			'impressum'   => 'Impressum',
			'datenschutz' => 'Datenschutz',
			'cookies'     => 'Cookies',
		) as $slug => $title ) {
			if ( get_page_by_path( jos_legal_page( $slug, $lang ) ) ) {
				continue;
			}
			wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $say( $title ),
					'post_name'    => jos_legal_page( $slug, $lang ),
					'post_content' => "<!-- wp:paragraph -->\n<p>" . $say( 'Inhalt folgt.' ) . "</p>\n<!-- /wp:paragraph -->",
				)
			);
		}
	}
	update_option( 'jos_legal_created', JOS_VERSION, false );
}
add_action( 'init', 'jos_create_legal_pages', 20 );

/**
 * The site has no Arabic any more: the Arabic pages of the arches (leistungen-ar, ...) go to the trash once,
 * where they can still be restored.
 */
function jos_remove_arabic_pages(): void {
	if ( get_option( 'jos_arabic_removed' ) ) {
		return;
	}
	foreach ( array( 'leistungen-ar', 'ueber-uns-ar', 'galerie-ar', 'kontakt-ar' ) as $slug ) {
		$page = get_page_by_path( $slug );
		if ( $page && 'trash' !== $page->post_status ) {
			wp_trash_post( $page->ID );
		}
	}
	update_option( 'jos_arabic_removed', JOS_VERSION, false );
}
add_action( 'init', 'jos_remove_arabic_pages', 20 );

/**
 * Names of the services on the German page in German. The page Leistungen was first written with the English
 * names of the booking page; they are replaced once, only where the page still has them.
 */
function jos_german_service_names(): void {
	if ( get_option( 'jos_services_german' ) ) {
		return;
	}
	$page = get_page_by_path( 'leistungen' );
	if ( $page ) {
		$names   = jos_service_names_de();
		$content = str_replace( array_keys( $names ), array_values( $names ), $page->post_content );
		$content = str_replace( array_map( 'esc_html', array_keys( $names ) ), array_map( 'esc_html', array_values( $names ) ), $content );
		if ( $content !== $page->post_content ) {
			wp_update_post(
				array(
					'ID'           => $page->ID,
					'post_content' => $content,
				)
			);
		}
	}
	update_option( 'jos_services_german', JOS_VERSION, false );
}
add_action( 'init', 'jos_german_service_names', 40 );

/**
 * The English names of the booking page and their German names, the longest first.
 *
 * @return array<string, string>
 */
function jos_service_names_de(): array {
	return array(
		'Combo Cut & Vikings Hot Towel' => 'Kombi Haarschnitt & Wikinger Heißtuch',
		'Combo Cut & Hot Towel'         => 'Kombi Haarschnitt & Heißtuch',
		'Combo Cut & Eyebrows'          => 'Kombi Haarschnitt & Augenbrauen',
		'Combo Cut & Trim'              => 'Kombi Haarschnitt & Trimmen',
		'Hot Towel Rasur'               => 'Heißtuchrasur',
		'Student’s Cut'                 => 'Studentenschnitt',
	);
}

/**
 * HairSalon schema on the front page, for search engines and AI search.
 */
function jos_shop_schema(): void {
	if ( ! is_front_page() ) {
		return;
	}
	$shop  = jos_shop();
	$hours = array();
	foreach ( $shop['hours'] as $slot ) {
		$hours[] = array(
			'@type'     => 'OpeningHoursSpecification',
			'dayOfWeek' => $slot[0],
			'opens'     => $slot[1],
			'closes'    => $slot[2],
		);
	}
	$schema = array(
		'@context'                  => 'https://schema.org',
		'@type'                     => 'HairSalon',
		'name'                      => $shop['name'],
		'url'                       => home_url( '/' ),
		'address'                   => array(
			'@type'           => 'PostalAddress',
			'streetAddress'   => $shop['street'],
			'postalCode'      => $shop['postcode'],
			'addressLocality' => $shop['city'],
			'addressCountry'  => $shop['country'],
		),
		'openingHoursSpecification' => $hours,
		'paymentAccepted'           => $shop['payment'],
		'knowsLanguage'             => $shop['languages'],
		'hasMap'                    => jos_maps_link(),
	);
	$phone = jos_phone();
	if ( $phone['text'] ) {
		$schema['telephone'] = $phone['text'];
	}
	echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . "</script>\n";
}
add_action( 'wp_head', 'jos_shop_schema' );

/**
 * Pages behind the arches of the facade, from right to left. arch is the index of the arch in
 * FACADE_ARCHES (assets/js/facade.js, from the left: window, window, door, window); the second arch from
 * the right is the door into the shop. slug is the anchor on the front page (#kontakt) in every language,
 * page the address of the WordPress page in that language (kontakt, kontakt-en).
 *
 * @param string|null $lang Language, default the language of this request.
 * @return array<int, array{slug: string, page: string, title: string, nav: string, door: bool, arch: int}>
 */
function jos_rooms( ?string $lang = null ): array {
	$lang  = $lang ?? jos_lang();
	$rooms = array(
		array( 'leistungen', 'Leistungen & Preise', 'Leistungen', false, 3 ),
		array( 'ueber-uns', 'Über uns', 'Über uns', true, 2 ),
		array( 'galerie', 'Galerie', 'Galerie', false, 1 ),
		array( 'kontakt', 'Kontakt', 'Kontakt', false, 0 ),
	);
	$strings = jos_strings();
	$say     = static fn( string $de ): string => 'de' === $lang ? $de : ( $strings[ $lang ][ $de ] ?? $de );
	return array_map(
		static fn( array $room ): array => array(
			'slug'  => $room[0],
			'page'  => 'de' === $lang ? $room[0] : $room[0] . '-' . $lang,
			'title' => $say( $room[1] ),
			'nav'   => $say( $room[2] ),
			'door'  => $room[3],
			'arch'  => $room[4],
		),
		$rooms
	);
}

/**
 * Creates the pages of the arches once, if they do not exist yet. Their content is then edited in WordPress.
 */
function jos_create_rooms(): void {
	if ( JOS_VERSION === get_option( 'jos_rooms_created' ) || ! current_user_can( 'publish_pages' ) ) {
		return;
	}
	$strings = jos_strings();
	foreach ( array_keys( jos_languages() ) as $lang ) {
		$placeholder = 'de' === $lang ? 'Inhalt folgt.' : $strings[ $lang ]['Inhalt folgt.'];
		foreach ( jos_rooms( $lang ) as $room ) {
			if ( get_page_by_path( $room['page'] ) ) {
				continue;
			}
			wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $room['title'],
					'post_name'    => $room['page'],
					'post_content' => "<!-- wp:paragraph -->\n<p>" . $placeholder . "</p>\n<!-- /wp:paragraph -->",
				)
			);
		}
	}
	update_option( 'jos_rooms_created', JOS_VERSION, false );
}
add_action( 'init', 'jos_create_rooms', 20 );

/**
 * First content of the pages behind the arches, from the prices and texts of the shop (04.10.2026).
 * A page is filled once, and only while it still holds just the placeholder "Inhalt folgt.";
 * after that the page is edited in WordPress and never touched again by the theme.
 */
function jos_fill_rooms(): void {
	if ( ! current_user_can( 'edit_pages' ) ) {
		return;
	}
	$done   = (array) get_option( 'jos_rooms_filled', array() );
	$before = count( $done );
	foreach ( jos_room_texts() as $slug => $content ) {
		if ( in_array( $slug, $done, true ) ) {
			continue;
		}
		$page = get_page_by_path( $slug );
		if ( ! $page ) {
			continue;
		}
		$placeholders = array_merge( array( 'Inhalt folgt.' ), array_column( jos_strings(), 'Inhalt folgt.' ) );
		if ( in_array( trim( wp_strip_all_tags( $page->post_content ) ), $placeholders, true ) ) {
			wp_update_post(
				array(
					'ID'           => $page->ID,
					'post_content' => $content,
				)
			);
		}
		$done[] = $slug;
	}
	if ( count( $done ) !== $before ) {
		update_option( 'jos_rooms_filled', $done, false );
	}
}
add_action( 'init', 'jos_fill_rooms', 30 );

/**
 * The price list (jos_room_words(), German and English) written into the pages Leistungen and leistungen-en
 * once, on the first visit of the site after this version (no login needed); a missing page is made. What was
 * on the page before stays in WordPress as a revision.
 */
function jos_write_prices(): void {
	$version = 'prices-2026-10-05';
	if ( $version === get_option( 'jos_prices_written' ) ) {
		return;
	}
	foreach ( array_keys( jos_languages() ) as $lang ) {
		foreach ( jos_rooms( $lang ) as $room ) {
			if ( 'leistungen' !== $room['slug'] ) {
				continue;
			}
			$content = jos_room_texts_in( $lang )['leistungen'];
			$page    = get_page_by_path( $room['page'] );
			if ( $page ) {
				wp_update_post(
					array(
						'ID'           => $page->ID,
						'post_status'  => 'publish',
						'post_content' => $content,
					)
				);
			} else {
				wp_insert_post(
					array(
						'post_type'    => 'page',
						'post_status'  => 'publish',
						'post_title'   => $room['title'],
						'post_name'    => $room['page'],
						'post_content' => $content,
					)
				);
			}
		}
	}
	update_option( 'jos_prices_written', $version, false );
}
add_action( 'init', 'jos_write_prices', 40 );

/**
 * First content of the pages behind the arches, in every language, by the address of the page
 * (leistungen, leistungen-en, ...). jos_fill_rooms() writes it once into a page that
 * still only says "Inhalt folgt."; after that the pages are edited in WordPress.
 *
 * @return array<string, string>
 */
function jos_room_texts(): array {
	$texts = array();
	foreach ( array_keys( jos_languages() ) as $lang ) {
		$suffix = 'de' === $lang ? '' : '-' . $lang;
		foreach ( jos_room_texts_in( $lang ) as $slug => $content ) {
			$texts[ $slug . $suffix ] = $content;
		}
	}
	return $texts;
}

/**
 * Content of the pages in one language.
 *
 * @param string $lang Language.
 * @return array<string, string>
 */
function jos_room_texts_in( string $lang ): array {
	$t = jos_room_words()[ $lang ];

	$leistungen = '';
	foreach ( $t['prices'] as $group => $rows ) {
		$leistungen .= jos_block_heading( $group ) . jos_block_table( $rows );
	}

	$ueber_uns = jos_block_paragraph( $t['intro'] )
		. jos_block_heading( $t['team_title'] )
		. jos_block_paragraph( $t['team'] )
		. jos_block_heading( $t['expect_title'] )
		. jos_block_list( $t['expect'] );

	$shop    = jos_shop();
	$kontakt = jos_block_heading( $t['address_title'] )
		. jos_block_paragraph( $shop['street'] . ', ' . $shop['postcode'] . ' ' . $shop['city'], jos_maps_link() )
		. jos_block_paragraph( $t['bus'] )
		. jos_block_heading( $t['hours_title'] )
		. jos_block_table( $t['hours'] )
		. jos_block_heading( $t['payment_title'] )
		. jos_block_paragraph( $t['payment'] )
		. jos_block_heading( $t['faq_title'] );
	foreach ( $t['faq'] as $question => $answer ) {
		$kontakt .= jos_block_question( $question, $answer );
	}

	return array(
		'leistungen' => $leistungen,
		'ueber-uns'  => $ueber_uns,
		'kontakt'    => $kontakt,
	);
}

/**
 * The words of the pages in German and English (prices and opening hours as on the booking page).
 *
 * @return array<string, array<string, mixed>>
 */
function jos_room_words(): array {
	return array(
		'de' => array(
			'prices'        => array(
				'Herrenhaarschnitte'          => array(
					array( 'Studentenschnitt', '30 Min.', '25 €' ),
					array( 'Haarschnitt mit Shampoo', '30 Min.', '32 €' ),
					array( 'Scherenschnitt', '45 Min.', '37 €' ),
					array( 'Kombi Haarschnitt & Augenbrauen', '45 Min.', '38 €' ),
					array( 'Kombi Haarschnitt & Trimmen', '1 Std.', '45 €' ),
					array( 'Kompletter Service', '1 Std. 15 Min.', '62 €' ),
				),
				'Bartpflege'                  => array(
					array( 'Bartschnitt', '30 Min.', '19 €' ),
					array( 'Heißtuchrasur', '45 Min.', '25 €' ),
					array( 'Haarschnitt und Bart trimmen', '1 Std. 15 Min.', '45 €' ),
					array( 'Kombi Haarschnitt & Heißtuch', '1 Std. 15 Min.', '52 €' ),
					array( 'Kombi Haarschnitt & Wikinger Heißtuch', '1 Std. 15 Min.', '52 €' ),
				),
				'Kinderhaarschnitte'          => array(
					array( 'Kinderhaarschnitt', '30 Min.', '16 €' ),
				),
				'Augenbrauen Formen & Design' => array(
					array( 'Augenbrauen definieren', '15 Min.', '9 €' ),
				),
			),
			'intro'         => 'Jo’s Barbershop liegt in Wien Mariahilf, im 6. Bezirk. Bei uns dreht sich alles um präzise Haarschnitte, akkurate Bärte und Zeit für dich.',
			'team_title'    => 'Das Team',
			'team'          => 'Inhaber Jwan bildet sich ständig weiter und kennt die neuesten Trends und Techniken. So bekommst du einen Look, der zu dir passt. Im Salon sprechen wir Deutsch, Englisch, Arabisch und Kurdisch.',
			'expect_title'  => 'Was dich erwartet',
			'expect'        => array(
				array( 'Atmosphäre:', 'modern und gemütlich, zum Wohlfühlen' ),
				array( 'Schwerpunkt:', 'Herrenhaarschnitte und Bartpflege' ),
				array( 'Produkte:', 'La Biosthétique' ),
				array( 'Extras:', 'kostenlose Getränke, kostenloses WLAN, Haustiere willkommen' ),
			),
			'address_title' => 'Adresse und Anfahrt',
			'bus'           => 'Die Bushaltestelle Sonnenuhrgasse liegt nur wenige Schritte vom Salon entfernt.',
			'hours_title'   => 'Öffnungszeiten',
			'hours'         => array(
				array( 'Montag', 'geschlossen' ),
				array( 'Dienstag', '10:00 bis 19:00' ),
				array( 'Mittwoch', '10:00 bis 19:00' ),
				array( 'Donnerstag', '10:00 bis 19:00' ),
				array( 'Freitag', '10:00 bis 19:00' ),
				array( 'Samstag', '10:00 bis 18:00' ),
				array( 'Sonntag', 'geschlossen' ),
			),
			'payment_title' => 'Bezahlung',
			'payment'       => 'Du kannst bar oder mit Kreditkarte bezahlen.',
			'faq_title'     => 'Häufige Fragen',
			'faq'           => array(
				'Wo finde ich euch?'                  => 'In der Gumpendorfer Straße 127 in 1060 Wien, im 6. Bezirk.',
				'Wann habt ihr geöffnet?'             => 'Dienstag bis Freitag von 10:00 bis 19:00 Uhr, Samstag von 10:00 bis 18:00 Uhr. Montag und Sonntag ist geschlossen.',
				'Kann ich mit Karte zahlen?'          => 'Ja, du kannst bar oder mit Kreditkarte bezahlen.',
				'Welche Sprachen sprecht ihr?'        => 'Deutsch, Englisch, Arabisch und Kurdisch.',
				'Wie komme ich mit den Öffis zu euch?' => 'Mit dem Bus bis zur Haltestelle Sonnenuhrgasse, von dort sind es nur wenige Schritte.',
				'Welche Produkte verwendet ihr?'      => 'Wir arbeiten mit Produkten von La Biosthétique.',
				'Gibt es Getränke und WLAN?'          => 'Ja, beides ist bei uns kostenlos.',
				'Darf ich mein Haustier mitbringen?'  => 'Ja, Haustiere sind bei uns willkommen.',
			),
		),
		'en' => array(
			'prices'        => array(
				'Men’s haircuts'            => array(
					array( 'Student’s Cut', '30 min', '25 €' ),
					array( 'Haircut with shampoo', '30 min', '32 €' ),
					array( 'Scissor cut', '45 min', '37 €' ),
					array( 'Combo Cut & Eyebrows', '45 min', '38 €' ),
					array( 'Combo Cut & Trim', '1 h', '45 €' ),
					array( 'Full service', '1 h 15 min', '62 €' ),
				),
				'Beard care'                => array(
					array( 'Beard trim', '30 min', '19 €' ),
					array( 'Hot towel shave', '45 min', '25 €' ),
					array( 'Haircut and beard trim', '1 h 15 min', '45 €' ),
					array( 'Combo Cut & Hot Towel', '1 h 15 min', '52 €' ),
					array( 'Combo Cut & Vikings Hot Towel', '1 h 15 min', '52 €' ),
				),
				'Children’s haircuts'       => array(
					array( 'Children’s haircut', '30 min', '16 €' ),
				),
				'Eyebrow shaping & design'  => array(
					array( 'Eyebrow definition', '15 min', '9 €' ),
				),
			),
			'intro'         => 'Jo’s Barbershop is in Vienna’s Mariahilf, the 6th district. Everything here is about precise haircuts, sharp beards and time for you.',
			'team_title'    => 'The team',
			'team'          => 'Owner Jwan keeps on training and knows the latest trends and techniques, so you get a look that suits you. In the salon we speak German, English, Arabic and Kurdish.',
			'expect_title'  => 'What to expect',
			'expect'        => array(
				array( 'Atmosphere:', 'modern and cosy, a place to feel good' ),
				array( 'Focus:', 'men’s haircuts and beard care' ),
				array( 'Products:', 'La Biosthétique' ),
				array( 'Extras:', 'free drinks, free Wi-Fi, pets welcome' ),
			),
			'address_title' => 'Address and directions',
			'bus'           => 'The Sonnenuhrgasse bus stop is just a few steps from the salon.',
			'hours_title'   => 'Opening hours',
			'hours'         => array(
				array( 'Monday', 'closed' ),
				array( 'Tuesday', '10:00 to 19:00' ),
				array( 'Wednesday', '10:00 to 19:00' ),
				array( 'Thursday', '10:00 to 19:00' ),
				array( 'Friday', '10:00 to 19:00' ),
				array( 'Saturday', '10:00 to 18:00' ),
				array( 'Sunday', 'closed' ),
			),
			'payment_title' => 'Payment',
			'payment'       => 'You can pay in cash or by credit card.',
			'faq_title'     => 'Frequently asked questions',
			'faq'           => array(
				'Where can I find you?'                     => 'At Gumpendorfer Straße 127 in 1060 Vienna, in the 6th district.',
				'When are you open?'                        => 'Tuesday to Friday from 10:00 to 19:00, Saturday from 10:00 to 18:00. Closed on Monday and Sunday.',
				'Can I pay by card?'                        => 'Yes, you can pay in cash or by credit card.',
				'Which languages do you speak?'             => 'German, English, Arabic and Kurdish.',
				'How do I get to you by public transport?'  => 'Take the bus to the Sonnenuhrgasse stop, from there it is only a few steps.',
				'Which products do you use?'                => 'We work with products by La Biosthétique.',
				'Are there drinks and Wi-Fi?'               => 'Yes, both are free.',
				'Can I bring my pet?'                       => 'Yes, pets are welcome.',
			),
		),
	);
}

/**
 * Heading block, level 3.
 *
 * @param string $text Text.
 */
function jos_block_heading( string $text ): string {
	return "<!-- wp:heading {\"level\":3} -->\n<h3 class=\"wp-block-heading\">" . esc_html( $text ) . "</h3>\n<!-- /wp:heading -->\n\n";
}

/**
 * Paragraph block, the whole text as a link if a link is given.
 *
 * @param string $text Text.
 * @param string $link Address of the link.
 */
function jos_block_paragraph( string $text, string $link = '' ): string {
	$inner = $link ? '<a href="' . esc_url( $link ) . '">' . esc_html( $text ) . '</a>' : esc_html( $text );
	return "<!-- wp:paragraph -->\n<p>" . $inner . "</p>\n<!-- /wp:paragraph -->\n\n";
}

/**
 * List block, every item with a bold label in front.
 *
 * @param array<int, array{0: string, 1: string}> $items Label and text of every item.
 */
function jos_block_list( array $items ): string {
	$list = '';
	foreach ( $items as $item ) {
		$list .= "<!-- wp:list-item -->\n<li><strong>" . esc_html( $item[0] ) . '</strong> ' . esc_html( $item[1] ) . "</li>\n<!-- /wp:list-item -->\n";
	}
	return "<!-- wp:list -->\n<ul class=\"wp-block-list\">" . $list . "</ul>\n<!-- /wp:list -->\n\n";
}

/**
 * Table block, for example a price list (service, duration, price) or opening hours (day, time).
 *
 * @param array<int, array<int, string>> $rows Rows of cells.
 */
function jos_block_table( array $rows ): string {
	$body = '';
	foreach ( $rows as $row ) {
		$body .= '<tr><td>' . implode( '</td><td>', array_map( 'esc_html', $row ) ) . '</td></tr>';
	}
	return "<!-- wp:table {\"hasFixedLayout\":false} -->\n<figure class=\"wp-block-table\"><table><tbody>" . $body . "</tbody></table></figure>\n<!-- /wp:table -->\n\n";
}

/**
 * Details block: one question of the FAQ with its answer.
 *
 * @param string $question Question.
 * @param string $answer   Answer.
 */
function jos_block_question( string $question, string $answer ): string {
	return "<!-- wp:details -->\n<details class=\"wp-block-details\"><summary>" . esc_html( $question ) . "</summary><!-- wp:paragraph -->\n<p>" . esc_html( $answer ) . "</p>\n<!-- /wp:paragraph --></details>\n<!-- /wp:details -->\n\n";
}

/**
 * Menu of the header: the pages of the arches as jump marks on the front page.
 */
function jos_nav(): void {
	$base = is_front_page() ? '' : jos_url( home_url( '/' ) );
	echo '<nav class="site-header__nav" aria-label="' . esc_attr( jos_t( 'Hauptmenü' ) ) . '"><ul>';
	foreach ( jos_rooms() as $room ) {
		printf( '<li><a href="%1$s" data-open="%2$s">%3$s</a></li>', esc_url( $base . '#' . $room['slug'] ), esc_attr( $room['slug'] ), esc_html( $room['nav'] ) );
	}
	echo '</ul><ul class="site-header__languages" aria-label="' . esc_attr( jos_t( 'Sprache' ) ) . '">';
	foreach ( jos_language_links() as $link ) {
		printf(
			'<li><a href="%1$s" hreflang="%2$s" lang="%2$s" data-lang="%6$s"%3$s title="%4$s">%5$s</a></li>',
			esc_url( $link['url'] ),
			esc_attr( jos_languages()[ $link['code'] ]['locale'] ),
			$link['current'] ? ' aria-current="true"' : '',
			esc_attr( $link['name'] ),
			esc_html( $link['label'] ),
			esc_attr( $link['code'] )
		);
	}
	echo '</ul></nav>';
}

/**
 * One page behind an arch, as a section of the front page (an overlay once motion.js runs).
 *
 * @param array{slug: string, title: string, nav: string, door: bool, arch: int} $room Room from jos_rooms().
 */
function jos_room( array $room ): void {
	$page  = get_page_by_path( $room['page'] );
	$title = $page ? get_the_title( $page ) : $room['title'];
	$id    = $room['slug'];
	?>
	<section id="<?php echo esc_attr( $id ); ?>" class="room<?php echo $room['door'] ? ' room--shop' : ''; ?>" data-room="<?php echo esc_attr( $id ); ?>" data-arch="<?php echo esc_attr( (string) $room['arch'] ); ?>"<?php echo $room['door'] ? ' data-door' : ''; ?> aria-labelledby="<?php echo esc_attr( $id ); ?>-title">
		<div class="room__inner">
			<h2 id="<?php echo esc_attr( $id ); ?>-title" class="room__title" data-reveal><?php echo esc_html( $title ); ?></h2>
			<div class="room__content" data-reveal>
				<?php
				if ( $page ) {
					echo apply_filters( 'the_content', $page->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- content of the page, filtered by WordPress.
				}
				?>
			</div>
			<?php if ( 'kontakt' === $room['slug'] ) : ?>
				<div class="room__action"><?php jos_booking_button(); ?></div>
			<?php endif; ?>
			<?php if ( current_user_can( 'edit_pages' ) ) : ?>
				<p class="room__edit">
					<?php if ( $page ) : ?>
						<a href="<?php echo esc_url( (string) get_edit_post_link( $page ) ); ?>"><?php echo esc_html( jos_t( 'Seite bearbeiten' ) ); ?></a>
					<?php else : ?>
						<a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=page' ) ); ?>"><?php echo esc_html( sprintf( jos_t( 'Seite mit der Adresse "%s" anlegen' ), $room['page'] ) ); ?></a>
					<?php endif; ?>
				</p>
			<?php endif; ?>
		</div>
		<?php
		if ( $page ) {
			jos_faq_schema( $page );
		}
		?>
	</section>
	<?php
}

/**
 * Collects the Details blocks (question as summary, answer as content) of a list of blocks, also nested ones.
 *
 * @param array $blocks Parsed blocks.
 * @return array<int, array> Details blocks.
 */
function jos_details_blocks( array $blocks ): array {
	$found = array();
	foreach ( $blocks as $block ) {
		if ( 'core/details' === $block['blockName'] ) {
			$found[] = $block;
		} elseif ( ! empty( $block['innerBlocks'] ) ) {
			$found = array_merge( $found, jos_details_blocks( $block['innerBlocks'] ) );
		}
	}
	return $found;
}

/**
 * FAQPage schema from the Details blocks of a page: every Details block is one question with its answer.
 *
 * @param WP_Post $page Page.
 */
function jos_faq_schema( WP_Post $page ): void {
	$items = array();
	foreach ( jos_details_blocks( parse_blocks( $page->post_content ) ) as $block ) {
		if ( ! preg_match( '#<summary[^>]*>(.*?)</summary>#s', $block['innerHTML'], $match ) ) {
			continue;
		}
		$answer = '';
		foreach ( $block['innerBlocks'] as $inner ) {
			$answer .= render_block( $inner );
		}
		$question = trim( wp_strip_all_tags( $match[1] ) );
		$answer   = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $answer ) ) );
		if ( $question && $answer ) {
			$items[] = array(
				'@type'          => 'Question',
				'name'           => $question,
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => $answer,
				),
			);
		}
	}
	if ( ! $items ) {
		return;
	}
	$schema = array(
		'@context'   => 'https://schema.org',
		'@type'      => 'FAQPage',
		'mainEntity' => $items,
	);
	echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . '</script>';
}
