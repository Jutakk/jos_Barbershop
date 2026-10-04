<?php
/**
 * Jo's Barbershop theme.
 *
 * @package jos-barbershop
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'JOS_VERSION', '0.2.0' );

/**
 * Theme supports.
 */
function jos_setup(): void {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'script', 'style', 'navigation-widgets' ) );
	load_theme_textdomain( 'jos-barbershop', get_template_directory() . '/languages' );
}
add_action( 'after_setup_theme', 'jos_setup' );

/**
 * Styles.
 */
function jos_enqueue_styles(): void {
	wp_enqueue_style( 'jos-style', get_stylesheet_uri(), array(), filemtime( get_template_directory() . '/style.css' ) );
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_styles' );

/**
 * GSAP, ScrollTrigger and the motion layer, all local, in the footer.
 */
function jos_enqueue_motion(): void {
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_enqueue_script( 'gsap', $dir . '/vendor/gsap.min.js', array(), '3.15.0', true );
	wp_enqueue_script( 'gsap-scrolltrigger', $dir . '/vendor/ScrollTrigger.min.js', array( 'gsap' ), '3.15.0', true );
	wp_enqueue_script( 'jos-motion', $dir . '/motion.js', array( 'gsap', 'gsap-scrolltrigger' ), filemtime( $path . '/motion.js' ), true );
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_motion' );

/**
 * three.js scene of the hero, loaded as ES module through the Script Modules API (importmap for 'three').
 */
function jos_enqueue_scene(): void {
	if ( ! is_front_page() ) {
		return;
	}
	$dir  = get_template_directory_uri() . '/assets/js';
	$path = get_template_directory() . '/assets/js';
	wp_register_script_module( 'three', $dir . '/vendor/three.module.min.js', array(), '0.186.1' );
	wp_enqueue_script_module( 'jos-scene', $dir . '/scene.js', array( 'three' ), filemtime( $path . '/scene.js' ) );
}
add_action( 'wp_enqueue_scripts', 'jos_enqueue_scene' );

/**
 * Customizer: link of the booking button (booking page or tel: link).
 *
 * @param WP_Customize_Manager $wp_customize Customizer.
 */
function jos_customize_register( WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_section(
		'jos_contact',
		array(
			'title'    => __( 'Jo\'s Barbershop', 'jos-barbershop' ),
			'priority' => 30,
		)
	);
	$wp_customize->add_setting(
		'jos_booking_link',
		array(
			'default'           => '',
			'sanitize_callback' => 'jos_sanitize_link',
		)
	);
	$wp_customize->add_control(
		'jos_booking_link',
		array(
			'label'       => __( 'Termin-Link', 'jos-barbershop' ),
			'description' => __( 'Buchungsseite (https://...) oder Telefon (tel:+43...).', 'jos-barbershop' ),
			'section'     => 'jos_contact',
			'type'        => 'text',
		)
	);
}
add_action( 'customize_register', 'jos_customize_register' );

/**
 * Allows https and tel links only.
 *
 * @param string $value Raw value.
 */
function jos_sanitize_link( string $value ): string {
	return esc_url_raw( trim( $value ), array( 'https', 'http', 'tel' ) );
}

/**
 * Booking button. Without a link only logged in editors see a hint where to set it.
 */
function jos_booking_button(): void {
	$link = get_theme_mod( 'jos_booking_link', '' );
	if ( $link ) {
		printf(
			'<a class="button" href="%1$s" data-reveal>%2$s</a>',
			esc_url( $link, array( 'https', 'http', 'tel' ) ),
			esc_html__( 'Termin buchen', 'jos-barbershop' )
		);
	} elseif ( current_user_can( 'customize' ) ) {
		printf(
			'<a class="button button--hint" href="%1$s" data-reveal>%2$s</a>',
			esc_url( admin_url( 'customize.php?autofocus[control]=jos_booking_link' ) ),
			esc_html__( 'Termin-Link im Customizer eintragen', 'jos-barbershop' )
		);
	}
}

/**
 * Logo files of the theme.
 *
 * @param string $file File name in assets/images.
 */
function jos_image( string $file ): string {
	return get_template_directory_uri() . '/assets/images/' . $file;
}
