<?php
/**
 * Footer in four columns, flush left (jos_footer_columns()): logo, copyright and agency; opening hours; the
 * menu with the legal pages and the FAQ; address and phone. On the front page the same columns are cut into the
 * foundation of the facade (scene.js); this footer then stays for keyboards and screen readers and slides in
 * when one of its links gets the focus.
 *
 * @package jos-barbershop
 */

$jos_columns = jos_footer_columns();
?>
<footer class="site-footer">
	<?php foreach ( $jos_columns as $jos_index => $jos_column ) : ?>
		<?php if ( 2 === $jos_index ) : ?>
			<nav class="site-footer__column site-footer__menu" aria-label="<?php echo esc_attr( jos_t( 'Rechtliches' ) ); ?>">
		<?php else : ?>
			<div class="site-footer__column">
		<?php endif; ?>
		<?php foreach ( $jos_column as $jos_item ) : ?>
			<?php if ( 'logo' === ( $jos_item['kind'] ?? '' ) ) : ?>
				<img class="site-footer__logo" src="<?php echo esc_url( jos_image( 'logo-small.webp' ) ); ?>" alt="<?php echo esc_attr( $jos_item['text'] ); ?>" width="32" height="32" loading="lazy">
			<?php elseif ( ! empty( $jos_item['url'] ) ) : ?>
				<a href="<?php echo esc_url( $jos_item['url'], array( 'https', 'http', 'tel' ) ); ?>"<?php echo isset( $jos_item['slug'] ) ? ' data-open="' . esc_attr( $jos_item['slug'] ) . '"' : ''; ?>><?php echo esc_html( $jos_item['text'] ); ?></a>
			<?php else : ?>
				<span><?php echo esc_html( $jos_item['text'] ); ?></span>
			<?php endif; ?>
		<?php endforeach; ?>
		<?php if ( 2 === $jos_index ) : ?>
			</nav>
		<?php else : ?>
			</div>
		<?php endif; ?>
	<?php endforeach; ?>
</footer>
<?php wp_footer(); ?>
</body>
</html>
