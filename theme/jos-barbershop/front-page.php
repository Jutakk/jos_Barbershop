<?php
/**
 * Front page: hero with the turning shop sign on the facade, then the street. Scrolling takes the camera
 * from arch to arch, from right to left, and through each arch into its page. Behind the door is the shop.
 * The pages are normal WordPress pages (jos_rooms()), so their content is edited in WordPress.
 *
 * @package jos-barbershop
 */

get_header();

$jos_panorama        = jos_image_if_exists( 'lokal-360.webp' );
$jos_panorama_mobile = jos_image_if_exists( 'lokal-360-mobile.webp' );
?>
<main id="inhalt" class="site-main journey">
	<div class="scene" data-scene data-logo="<?php echo esc_url( jos_image( 'logo-texture.webp' ) ); ?>"<?php echo $jos_panorama ? ' data-panorama="' . esc_url( $jos_panorama ) . '"' : ''; ?><?php echo $jos_panorama_mobile ? ' data-panorama-mobile="' . esc_url( $jos_panorama_mobile ) . '"' : ''; ?>>
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

	<?php foreach ( jos_rooms() as $jos_index => $jos_room ) : ?>
		<div class="street<?php echo $jos_room['door'] ? ' street--door' : ''; ?>" data-street aria-hidden="true"></div>
		<?php if ( $jos_room['door'] ) : ?>
			<div class="street street--shop" data-shop aria-hidden="true"></div>
		<?php endif; ?>
		<?php jos_room( $jos_room ); ?>
	<?php endforeach; ?>
</main>
<?php
get_footer();
