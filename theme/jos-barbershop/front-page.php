<?php
/**
 * Front page (in German or English, inc/languages.php): the turning shop sign on the facade, drawn in lines. Scrolling or dragging moves the camera
 * along the street (and down to the foundation, where the footer lines are cut in). The arches are the
 * menu: a running text in the band of every arch names its page, the whole opening is the button, a click
 * takes the camera through the arch and the page opens; behind the door is the shop. The X, Esc or the
 * back button lead back to the street.
 * The pages are normal WordPress pages (jos_rooms()), so their content is edited in WordPress.
 * Without JavaScript the pages simply follow the hero.
 *
 * @package jos-barbershop
 */

get_header();

$jos_panorama        = jos_image_if_exists( 'lokal-360.webp' );
$jos_panorama_mobile = jos_image_if_exists( 'lokal-360-mobile.webp' );
$jos_arches          = array();
foreach ( jos_rooms() as $jos_room ) {
	$jos_arches[] = array(
		'arch' => $jos_room['arch'],
		'slug' => $jos_room['slug'],
		'name' => $jos_room['nav'],
	);
}
?>
<main id="inhalt" class="site-main journey">
	<div class="scene" data-scene
		data-logo="<?php echo esc_url( jos_image( 'logo-texture.webp' ) ); ?>"
		data-logo-glow="<?php echo esc_url( jos_image( 'logo-glow.webp' ) ); ?>"
		data-paper="<?php echo esc_url( jos_image( 'paper.webp' ) ); ?>"
		data-arches="<?php echo esc_attr( wp_json_encode( $jos_arches, JSON_UNESCAPED_UNICODE ) ); ?>"
		data-footer="<?php echo esc_attr( wp_json_encode( jos_footer_columns(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?>"
		data-languages="<?php echo esc_attr( wp_json_encode( jos_language_links(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?>"
		data-gallery-owner="<?php echo esc_url( jos_image( 'jo.webp' ) ); ?>"
		<?php echo $jos_panorama ? 'data-panorama="' . esc_url( $jos_panorama ) . '"' : ''; ?>
		<?php echo $jos_panorama_mobile ? 'data-panorama-mobile="' . esc_url( $jos_panorama_mobile ) . '"' : ''; ?>>
		<img class="scene__poster" src="<?php echo esc_url( jos_image( 'scene-poster.webp' ) ); ?>" alt="" width="1600" height="1000" fetchpriority="high">
		<canvas class="scene__canvas" aria-hidden="true"></canvas>
	</div>

	<?php // green creepers hanging from the top edge of the screen (vines.js) ?>
	<div class="vines" data-vines aria-hidden="true"></div>

	<section class="hero" aria-labelledby="hero-title">
		<div class="hero__content">
			<?php
			// one word per line: JO'S / dein / Selbstbewusstsein / beginnt / hier (English: your / confidense /
			// starts / here), against the bottom left corner of the house (scene.js); the booking button is on the
			// contact page
			?>
			<h1 id="hero-title" class="hero__title" data-reveal>
				<span class="hero__word hero__brand">Jo&rsquo;s</span><span class="visually-hidden"> Barbershop.</span>
				<?php foreach ( explode( ' ', jos_t( 'dein Selbstbewusstsein beginnt hier' ) ) as $jos_word ) : ?>
					<span class="hero__word"><?php echo esc_html( $jos_word ); ?></span>
				<?php endforeach; ?>
			</h1>
			<p class="hero__meta" data-reveal><?php echo esc_html( jos_t( 'BARBERSHOP in 1060 WIEN' ) ); ?></p>
		</div>
	</section>

	<?php
	foreach ( jos_rooms() as $jos_room ) {
		jos_room( $jos_room );
	}
	?>

	<?php // inside the shop: drag to look around (motion.js) ?>
	<div class="shop-drag" data-shop-drag hidden aria-hidden="true"></div>
	<p class="shop-hint" data-shop-hint hidden><?php echo esc_html( jos_t( 'Ziehen, um sich umzusehen' ) ); ?></p>

	<?php // leads out of a page or the shop, back to the street ?>
	<button class="view-exit" type="button" data-exit hidden aria-label="<?php echo esc_attr( jos_t( 'Zurück auf die Straße' ) ); ?>">
		<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M15 15 33 33M33 15 15 33"/></svg>
	</button>
</main>
<?php
get_footer();
