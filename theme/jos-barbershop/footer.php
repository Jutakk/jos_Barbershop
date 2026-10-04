<?php
/**
 * Footer.
 *
 * @package jos-barbershop
 */

$jos_privacy = get_privacy_policy_url();
$jos_imprint = get_page_by_path( 'impressum' );
?>
<footer class="site-footer">
	<p class="site-footer__copy">&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?> Jo&rsquo;s Barbershop</p>
	<?php if ( $jos_imprint || $jos_privacy ) : ?>
		<nav class="site-footer__legal" aria-label="<?php esc_attr_e( 'Rechtliches', 'jos-barbershop' ); ?>">
			<?php if ( $jos_imprint ) : ?>
				<a href="<?php echo esc_url( get_permalink( $jos_imprint ) ); ?>"><?php esc_html_e( 'Impressum', 'jos-barbershop' ); ?></a>
			<?php endif; ?>
			<?php if ( $jos_privacy ) : ?>
				<a href="<?php echo esc_url( $jos_privacy ); ?>"><?php esc_html_e( 'Datenschutz', 'jos-barbershop' ); ?></a>
			<?php endif; ?>
		</nav>
	<?php endif; ?>
</footer>
<?php wp_footer(); ?>
</body>
</html>
