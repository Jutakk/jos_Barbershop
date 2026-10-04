<?php
/**
 * Footer: copyright, address and the legal pages (jos_footer_items()). On the front page the same lines
 * are cut into the foundation of the facade (scene.js); this footer then stays for keyboards and
 * screen readers and slides in when one of its links gets the focus.
 *
 * @package jos-barbershop
 */

$jos_footer = jos_footer_items();
$jos_legal  = array_filter( $jos_footer, fn( $item ) => 'legal' === $item['kind'] );
?>
<footer class="site-footer">
	<?php foreach ( $jos_footer as $jos_item ) : ?>
		<?php if ( 'copy' === $jos_item['kind'] ) : ?>
			<p class="site-footer__copy"><?php echo esc_html( $jos_item['text'] ); ?></p>
		<?php elseif ( 'address' === $jos_item['kind'] ) : ?>
			<p class="site-footer__address"><a href="<?php echo esc_url( $jos_item['url'] ); ?>"><?php echo esc_html( $jos_item['text'] ); ?></a></p>
		<?php endif; ?>
	<?php endforeach; ?>
	<?php if ( $jos_legal ) : ?>
		<nav class="site-footer__legal" aria-label="<?php esc_attr_e( 'Rechtliches', 'jos-barbershop' ); ?>">
			<?php foreach ( $jos_legal as $jos_item ) : ?>
				<a href="<?php echo esc_url( $jos_item['url'] ); ?>"><?php echo esc_html( $jos_item['text'] ); ?></a>
			<?php endforeach; ?>
		</nav>
	<?php endif; ?>
</footer>
<?php wp_footer(); ?>
</body>
</html>
