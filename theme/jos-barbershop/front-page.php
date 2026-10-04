<?php
/**
 * Front page: the turning shop sign on the facade, drawn in lines. The arches are the menu: a slow
 * running text in the band of every arch names its page, a click takes the camera through the arch and
 * the page opens; behind the door is the shop. The X, Esc or the back button lead back to the street.
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
		data-arches="<?php echo esc_attr( wp_json_encode( $jos_arches, JSON_UNESCAPED_UNICODE ) ); ?>"
		<?php echo $jos_panorama ? 'data-panorama="' . esc_url( $jos_panorama ) . '"' : ''; ?>
		<?php echo $jos_panorama_mobile ? 'data-panorama-mobile="' . esc_url( $jos_panorama_mobile ) . '"' : ''; ?>>
		<img class="scene__poster" src="<?php echo esc_url( jos_image( 'scene-poster.webp' ) ); ?>" alt="" width="1600" height="1000" fetchpriority="high">
		<canvas class="scene__canvas" aria-hidden="true"></canvas>
	</div>

	<section class="hero" aria-labelledby="hero-title">
		<div class="hero__content">
			<h1 id="hero-title" class="hero__title" data-reveal>
				<span class="visually-hidden">Jo&rsquo;s Barbershop. </span>your confidence starts here
			</h1>
			<p class="hero__meta" data-reveal><?php esc_html_e( 'Barbershop in 1060 Wien', 'jos-barbershop' ); ?></p>
			<?php jos_booking_button(); ?>
		</div>
	</section>

	<?php
	foreach ( jos_rooms() as $jos_room ) {
		jos_room( $jos_room );
	}
	?>

	<?php // inside the shop: drag to look around (motion.js) ?>
	<div class="shop-drag" data-shop-drag hidden aria-hidden="true"></div>
	<p class="shop-hint" data-shop-hint hidden><?php esc_html_e( 'Ziehen, um sich umzusehen', 'jos-barbershop' ); ?></p>

	<?php // leads out of a page or the shop, back to the street ?>
	<button class="view-exit" type="button" data-exit hidden aria-label="<?php esc_attr_e( 'Zurück auf die Straße', 'jos-barbershop' ); ?>">
		<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M15 15 33 33M33 15 15 33"/></svg>
	</button>
</main>
<?php
get_footer();
