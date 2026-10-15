<?php
/**
 * Fallback template for pages and posts.
 *
 * @package jos-barbershop
 */

get_header();

// the vines of this page (vines.js): their order comes from the name of the page, the same in German and English
$jos_vines = is_singular() ? (string) preg_replace( '/-en$/', '', (string) get_post_field( 'post_name', get_queried_object_id() ) ) : 'page';
?>
<div class="vines vines--page" data-vines data-plants="<?php echo esc_url( jos_image( 'plants.svg' ) ); ?>" data-seed="<?php echo esc_attr( $jos_vines ? $jos_vines : 'page' ); ?>" aria-hidden="true"></div>
<main id="inhalt" class="site-main page">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article <?php post_class( 'page__article' ); ?>>
			<h1 class="page__title"><?php the_title(); ?></h1>
			<div class="page__content">
				<?php the_content(); ?>
			</div>
			<?php
			// questions in Details blocks (the page Häufige Fragen): FAQPage schema for the search engines, never for a
			// page behind a password
			if ( get_post() && ! post_password_required() ) {
				jos_faq_schema( get_post() );
			}
			?>
		</article>
		<?php
	endwhile;
	?>
</main>
<?php
get_footer();
