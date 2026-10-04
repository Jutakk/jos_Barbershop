<?php
/**
 * Front page: hero with the turning shop sign.
 *
 * @package jos-barbershop
 */

get_header();
?>
<main id="inhalt" class="site-main">
	<section class="hero" aria-labelledby="hero-title">
		<div class="scene" data-scene data-logo="<?php echo esc_url( jos_image( 'logo-texture.webp' ) ); ?>">
			<img class="scene__poster" src="<?php echo esc_url( jos_image( 'scene-poster.webp' ) ); ?>" alt="" width="1600" height="1000" fetchpriority="high">
			<canvas class="scene__canvas" aria-hidden="true"></canvas>
		</div>
		<div class="hero__content">
			<h1 id="hero-title" class="hero__title" data-reveal>
				<span class="visually-hidden">Jo&rsquo;s Barbershop. </span>your confidence starts here
			</h1>
			<p class="hero__meta" data-reveal><?php esc_html_e( 'Barbershop in 1060 Wien', 'jos-barbershop' ); ?></p>
			<?php jos_booking_button(); ?>
		</div>
	</section>
</main>
<?php
get_footer();
