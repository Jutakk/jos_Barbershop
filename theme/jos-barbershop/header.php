<?php
/**
 * Header.
 *
 * @package jos-barbershop
 */

?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#inhalt"><?php esc_html_e( 'Zum Inhalt', 'jos-barbershop' ); ?></a>
<header class="site-header">
	<a class="site-header__brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">Jo&rsquo;s Barbershop</a>
	<?php jos_nav(); ?>
</header>
