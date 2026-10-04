<?php
/**
 * Jo's Barbershop theme.
 *
 * @package jos-barbershop
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'JOS_VERSION', '0.6.0' );

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
 * GSAP and the motion layer (the way through the arches into the pages), all local, in the footer.
 */
function jos_enqueue_motion(): void {
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_enqueue_script( 'gsap', $dir . '/vendor/gsap.min.js', array(), '3.15.0', true );
	wp_enqueue_script( 'jos-motion', $dir . '/motion.js', array( 'gsap' ), filemtime( $path . '/motion.js' ), true );
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
}
add_action( 'customize_register', 'jos_customize_register' );

/**
 * Allows https and tel links only.
 *
 * @param string $value Raw value.
 */
function jos_sanitize_link( string $value ): string {
	return esc_url_raw( trim( $value ), array( 'https', 'http', 'tel' ) );
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
			esc_html__( 'Termin buchen', 'jos-barbershop' )
		);
	} elseif ( current_user_can( 'customize' ) ) {
		printf(
			'<a class="button button--hint" href="%1$s" data-reveal>%2$s</a>',
			esc_url( admin_url( 'customize.php?autofocus[control]=jos_booking_link' ) ),
			esc_html__( 'Termin-Link im Customizer eintragen', 'jos-barbershop' )
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
	echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . "</script>\n";
}
add_action( 'wp_head', 'jos_shop_schema' );

/**
 * Pages behind the arches of the facade, from right to left. arch is the index of the arch in
 * FACADE_ARCHES (assets/js/facade.js, from the left: window, window, door, window); the second arch from
 * the right is the door into the shop.
 *
 * @return array<int, array{slug: string, title: string, nav: string, door: bool, arch: int}>
 */
function jos_rooms(): array {
	return array(
		array(
			'slug'  => 'leistungen',
			'title' => __( 'Leistungen & Preise', 'jos-barbershop' ),
			'nav'   => __( 'Leistungen', 'jos-barbershop' ),
			'door'  => false,
			'arch'  => 3,
		),
		array(
			'slug'  => 'ueber-uns',
			'title' => __( 'Über uns', 'jos-barbershop' ),
			'nav'   => __( 'Über uns', 'jos-barbershop' ),
			'door'  => true,
			'arch'  => 2,
		),
		array(
			'slug'  => 'galerie',
			'title' => __( 'Galerie', 'jos-barbershop' ),
			'nav'   => __( 'Galerie', 'jos-barbershop' ),
			'door'  => false,
			'arch'  => 1,
		),
		array(
			'slug'  => 'kontakt',
			'title' => __( 'Kontakt', 'jos-barbershop' ),
			'nav'   => __( 'Kontakt', 'jos-barbershop' ),
			'door'  => false,
			'arch'  => 0,
		),
	);
}

/**
 * Creates the pages of the arches once, if they do not exist yet. Their content is then edited in WordPress.
 */
function jos_create_rooms(): void {
	if ( get_option( 'jos_rooms_created' ) || ! current_user_can( 'publish_pages' ) ) {
		return;
	}
	foreach ( jos_rooms() as $room ) {
		if ( get_page_by_path( $room['slug'] ) ) {
			continue;
		}
		wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $room['title'],
				'post_name'    => $room['slug'],
				'post_content' => "<!-- wp:paragraph -->\n<p>Inhalt folgt.</p>\n<!-- /wp:paragraph -->",
			)
		);
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
		if ( 'Inhalt folgt.' === trim( wp_strip_all_tags( $page->post_content ) ) ) {
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
 * Block markup of the first content of the pages, by address.
 *
 * @return array<string, string>
 */
function jos_room_texts(): array {
	$leistungen = '';
	$prices     = array(
		'Herrenhaarschnitte'          => array(
			array( 'Student’s Cut', '30 Min.', '25 €' ),
			array( 'Haarschnitt mit Shampoo', '30 Min.', '32 €' ),
			array( 'Scherenschnitt', '45 Min.', '37 €' ),
			array( 'Combo Cut & Eyebrows', '45 Min.', '38 €' ),
			array( 'Combo Cut & Trim', '1 Std.', '45 €' ),
			array( 'Kompletter Service', '1 Std. 15 Min.', '62 €' ),
		),
		'Bartpflege'                  => array(
			array( 'Bartschnitt', '30 Min.', '19 €' ),
			array( 'Hot Towel Rasur', '45 Min.', '25 €' ),
			array( 'Haarschnitt und Bart trimmen', '1 Std. 15 Min.', '45 €' ),
			array( 'Combo Cut & Hot Towel', '1 Std. 15 Min.', '52 €' ),
			array( 'Combo Cut & Vikings Hot Towel', '1 Std. 15 Min.', '52 €' ),
		),
		'Kinderhaarschnitte'          => array(
			array( 'Kinderhaarschnitt', '30 Min.', '16 €' ),
		),
		'Augenbrauen Formen & Design' => array(
			array( 'Augenbrauen definieren', '15 Min.', '9 €' ),
		),
	);
	foreach ( $prices as $group => $rows ) {
		$leistungen .= jos_block_heading( $group ) . jos_block_table( $rows );
	}

	$ueber_uns = jos_block_paragraph( 'Jo’s Barbershop liegt in Wien Mariahilf, im 6. Bezirk. Bei uns dreht sich alles um präzise Haarschnitte, akkurate Bärte und Zeit für dich.' )
		. jos_block_heading( 'Das Team' )
		. jos_block_paragraph( 'Inhaber Jwan bildet sich ständig weiter und kennt die neuesten Trends und Techniken. So bekommst du einen Look, der zu dir passt. Im Salon sprechen wir Deutsch, Englisch, Arabisch und Kurdisch.' )
		. jos_block_heading( 'Was dich erwartet' )
		. jos_block_list(
			array(
				array( 'Atmosphäre:', 'modern und gemütlich, zum Wohlfühlen' ),
				array( 'Schwerpunkt:', 'Herrenhaarschnitte und Bartpflege' ),
				array( 'Produkte:', 'La Biosthétique' ),
				array( 'Extras:', 'kostenlose Getränke, kostenloses WLAN, Haustiere willkommen' ),
			)
		);

	$shop    = jos_shop();
	$kontakt = jos_block_heading( 'Adresse und Anfahrt' )
		. jos_block_paragraph( $shop['street'] . ', ' . $shop['postcode'] . ' ' . $shop['city'], jos_maps_link() )
		. jos_block_paragraph( 'Die Bushaltestelle Sonnenuhrgasse liegt nur wenige Schritte vom Salon entfernt.' )
		. jos_block_heading( 'Öffnungszeiten' )
		. jos_block_table(
			array(
				array( 'Montag', 'geschlossen' ),
				array( 'Dienstag', '10:00 bis 19:00' ),
				array( 'Mittwoch', '10:00 bis 19:00' ),
				array( 'Donnerstag', '10:00 bis 19:00' ),
				array( 'Freitag', '10:00 bis 19:00' ),
				array( 'Samstag', '10:00 bis 18:00' ),
				array( 'Sonntag', 'geschlossen' ),
			)
		)
		. jos_block_heading( 'Bezahlung' )
		. jos_block_paragraph( 'Du kannst bar oder mit Kreditkarte bezahlen.' )
		. jos_block_heading( 'Häufige Fragen' )
		. jos_block_question( 'Wo finde ich euch?', 'In der Gumpendorfer Straße 127 in 1060 Wien, im 6. Bezirk.' )
		. jos_block_question( 'Wann habt ihr geöffnet?', 'Dienstag bis Freitag von 10:00 bis 19:00 Uhr, Samstag von 10:00 bis 18:00 Uhr. Montag und Sonntag ist geschlossen.' )
		. jos_block_question( 'Kann ich mit Karte zahlen?', 'Ja, du kannst bar oder mit Kreditkarte bezahlen.' )
		. jos_block_question( 'Welche Sprachen sprecht ihr?', 'Deutsch, Englisch, Arabisch und Kurdisch.' )
		. jos_block_question( 'Wie komme ich mit den Öffis zu euch?', 'Mit dem Bus bis zur Haltestelle Sonnenuhrgasse, von dort sind es nur wenige Schritte.' )
		. jos_block_question( 'Welche Produkte verwendet ihr?', 'Wir arbeiten mit Produkten von La Biosthétique.' )
		. jos_block_question( 'Gibt es Getränke und WLAN?', 'Ja, beides ist bei uns kostenlos.' )
		. jos_block_question( 'Darf ich mein Haustier mitbringen?', 'Ja, Haustiere sind bei uns willkommen.' );

	return array(
		'leistungen' => $leistungen,
		'ueber-uns'  => $ueber_uns,
		'kontakt'    => $kontakt,
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
	$base = is_front_page() ? '' : home_url( '/' );
	echo '<nav class="site-header__nav" aria-label="' . esc_attr__( 'Hauptmenü', 'jos-barbershop' ) . '"><ul>';
	foreach ( jos_rooms() as $room ) {
		printf( '<li><a href="%1$s" data-open="%2$s">%3$s</a></li>', esc_url( $base . '#' . $room['slug'] ), esc_attr( $room['slug'] ), esc_html( $room['nav'] ) );
	}
	echo '</ul></nav>';
}

/**
 * One page behind an arch, as a section of the front page (an overlay once motion.js runs).
 *
 * @param array{slug: string, title: string, nav: string, door: bool, arch: int} $room Room from jos_rooms().
 */
function jos_room( array $room ): void {
	$page  = get_page_by_path( $room['slug'] );
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
						<a href="<?php echo esc_url( (string) get_edit_post_link( $page ) ); ?>"><?php esc_html_e( 'Seite bearbeiten', 'jos-barbershop' ); ?></a>
					<?php else : ?>
						<a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=page' ) ); ?>"><?php echo esc_html( sprintf( /* translators: %s: slug of the missing page */ __( 'Seite mit der Adresse "%s" anlegen', 'jos-barbershop' ), $room['slug'] ) ); ?></a>
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
