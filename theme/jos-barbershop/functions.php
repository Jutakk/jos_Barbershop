<?php
/**
 * Jo's Barbershop theme.
 *
 * @package jos-barbershop
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'JOS_VERSION', '0.4.2' );

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
 * GSAP, ScrollTrigger and the motion layer, all local, in the footer.
 */
function jos_enqueue_motion(): void {
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_enqueue_script( 'gsap', $dir . '/vendor/gsap.min.js', array(), '3.15.0', true );
	wp_enqueue_script( 'gsap-scrolltrigger', $dir . '/vendor/ScrollTrigger.min.js', array( 'gsap' ), '3.15.0', true );
	wp_enqueue_script( 'jos-motion', $dir . '/motion.js', array( 'gsap', 'gsap-scrolltrigger' ), filemtime( $path . '/motion.js' ), true );
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
 * Pages behind the arches of the facade, in the order the camera visits them: from right to left.
 * The second arch from the right is the door into the shop.
 *
 * @return array<int, array{slug: string, title: string, nav: string, door: bool}>
 */
function jos_rooms(): array {
	return array(
		array(
			'slug'  => 'leistungen',
			'title' => __( 'Leistungen & Preise', 'jos-barbershop' ),
			'nav'   => __( 'Leistungen', 'jos-barbershop' ),
			'door'  => false,
		),
		array(
			'slug'  => 'ueber-uns',
			'title' => __( 'Über uns', 'jos-barbershop' ),
			'nav'   => __( 'Über uns', 'jos-barbershop' ),
			'door'  => true,
		),
		array(
			'slug'  => 'galerie',
			'title' => __( 'Galerie', 'jos-barbershop' ),
			'nav'   => __( 'Galerie', 'jos-barbershop' ),
			'door'  => false,
		),
		array(
			'slug'  => 'kontakt',
			'title' => __( 'Kontakt', 'jos-barbershop' ),
			'nav'   => __( 'Kontakt', 'jos-barbershop' ),
			'door'  => false,
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
 * Menu of the header: the pages of the arches as jump marks on the front page.
 */
function jos_nav(): void {
	$base = is_front_page() ? '' : home_url( '/' );
	echo '<nav class="site-header__nav" aria-label="' . esc_attr__( 'Hauptmenü', 'jos-barbershop' ) . '"><ul>';
	foreach ( jos_rooms() as $room ) {
		printf( '<li><a href="%1$s">%2$s</a></li>', esc_url( $base . '#' . $room['slug'] ), esc_html( $room['nav'] ) );
	}
	echo '</ul></nav>';
}

/**
 * One page behind an arch, as a section of the front page.
 *
 * @param array{slug: string, title: string, nav: string, door: bool} $room Room from jos_rooms().
 */
function jos_room( array $room ): void {
	$page  = get_page_by_path( $room['slug'] );
	$title = $page ? get_the_title( $page ) : $room['title'];
	$id    = $room['slug'];
	?>
	<section id="<?php echo esc_attr( $id ); ?>" class="room<?php echo $room['door'] ? ' room--shop' : ''; ?>" data-room aria-labelledby="<?php echo esc_attr( $id ); ?>-title">
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
