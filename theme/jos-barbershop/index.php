<?php
/**
 * Fallback template for pages and posts.
 *
 * @package jos-barbershop
 */

get_header();
?>
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
		</article>
		<?php
	endwhile;
	?>
</main>
<?php
get_footer();
