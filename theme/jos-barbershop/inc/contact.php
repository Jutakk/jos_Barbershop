<?php
/**
 * Contact form of the page Kontakt: a minimal two sided card (name, e-mail, message on the front, the thanks on
 * the back) that floats in space and can be turned (contact.js). The message goes by e-mail to the address of the
 * Customizer field "Kontakt-E-Mail" (empty: the e-mail of the WordPress administrator), with the sender as
 * Reply-To; nothing is stored. contact.js sends it with fetch; without JavaScript the form posts to admin-post.php
 * and comes back to #kontakt.
 * Against spam: a field hidden from people (website) must stay empty and the form must have been open for
 * JOS_CONTACT_MIN_SECONDS; a bot gets the same answer as a person, so it learns nothing.
 *
 * @package jos-barbershop
 */

const JOS_CONTACT_MIN_SECONDS = 3;

/**
 * Where the messages of the contact form go.
 */
function jos_contact_email(): string {
	$email = sanitize_email( (string) get_theme_mod( 'jos_contact_email', '' ) );
	return is_email( $email ) ? $email : (string) get_option( 'admin_email' );
}

/**
 * Customizer: the address of the contact form, in the section of the shop.
 *
 * @param WP_Customize_Manager $wp_customize Customizer.
 */
function jos_contact_customize( WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_setting(
		'jos_contact_email',
		array(
			'default'           => '',
			'sanitize_callback' => 'sanitize_email',
		)
	);
	$wp_customize->add_control(
		'jos_contact_email',
		array(
			'label'       => __( 'Kontakt-E-Mail', 'jos-barbershop' ),
			'description' => __( 'Hierher schickt das Kontaktformular die Nachrichten. Leer: die E-Mail des Administrators.', 'jos-barbershop' ),
			'section'     => 'jos_contact',
			'type'        => 'email',
		)
	);
}
add_action( 'customize_register', 'jos_contact_customize', 20 );

/**
 * The card of the contact form. After sending without JavaScript it shows its back (?kontakt=gesendet) or says that
 * the message did not go out (?kontakt=fehler).
 */
function jos_contact_form(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only chooses which side of the card shows.
	$state   = isset( $_GET['kontakt'] ) ? sanitize_key( wp_unslash( $_GET['kontakt'] ) ) : '';
	$sent    = 'gesendet' === $state;
	$privacy = get_page_by_path( jos_legal_page( 'datenschutz' ) );
	?>
	<div class="contact" data-contact data-sending="<?php echo esc_attr( jos_t( 'Wird gesendet' ) ); ?>" data-error="<?php echo esc_attr( jos_t( 'Die Nachricht konnte nicht gesendet werden. Bitte versuch es später noch einmal.' ) ); ?>">
		<div class="contact__card<?php echo $sent ? ' is-sent' : ''; ?>" data-contact-card>
			<form class="contact__face contact__face--front" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-contact-form<?php echo $sent ? ' inert' : ''; ?>>
				<h3 class="contact__title"><?php echo esc_html( jos_t( 'Schreib uns' ) ); ?></h3>
				<label class="contact__field">
					<span class="contact__label"><?php echo esc_html( jos_t( 'Name' ) ); ?></span>
					<input class="contact__input" name="name" type="text" autocomplete="name" maxlength="100" required>
				</label>
				<label class="contact__field">
					<span class="contact__label"><?php echo esc_html( jos_t( 'E-Mail' ) ); ?></span>
					<input class="contact__input" name="email" type="email" autocomplete="email" maxlength="150" required>
				</label>
				<label class="contact__field">
					<span class="contact__label"><?php echo esc_html( jos_t( 'Nachricht' ) ); ?></span>
					<textarea class="contact__input" name="message" rows="4" maxlength="5000" required></textarea>
				</label>
				<?php // for bots only: people never see this field, so it stays empty ?>
				<p class="contact__trap" aria-hidden="true">
					<label>Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label>
				</p>
				<input type="hidden" name="action" value="jos_contact">
				<input type="hidden" name="lang" value="<?php echo esc_attr( jos_lang() ); ?>">
				<input type="hidden" name="since" value="<?php echo esc_attr( (string) time() ); ?>">
				<?php wp_nonce_field( 'jos_contact', 'jos_contact_nonce', false ); ?>
				<p class="contact__note">
					<?php echo esc_html( jos_t( 'Deine Angaben verwenden wir nur, um dir zu antworten.' ) ); ?>
					<?php if ( $privacy ) : ?>
						<a href="<?php echo esc_url( jos_url( (string) get_permalink( $privacy ) ) ); ?>"><?php echo esc_html( jos_t( 'Datenschutz' ) ); ?></a>
					<?php endif; ?>
				</p>
				<div class="contact__send">
					<button class="button" type="submit" data-contact-submit><?php echo esc_html( jos_t( 'Senden' ) ); ?></button>
					<p class="contact__status" role="status" aria-live="polite" data-contact-status><?php echo 'fehler' === $state ? esc_html( jos_t( 'Die Nachricht konnte nicht gesendet werden. Bitte versuch es später noch einmal.' ) ) : ''; ?></p>
				</div>
			</form>
			<div class="contact__face contact__face--back" data-contact-thanks<?php echo $sent ? '' : ' inert'; ?>>
				<h3 class="contact__title"><?php echo esc_html( jos_t( 'Danke!' ) ); ?></h3>
				<p><?php echo esc_html( jos_t( 'Deine Nachricht ist angekommen. Wir melden uns bald.' ) ); ?></p>
				<button class="button" type="button" data-contact-again><?php echo esc_html( jos_t( 'Neue Nachricht' ) ); ?></button>
			</div>
		</div>
	</div>
	<?php
}

/**
 * Receives the contact form (admin-post.php, action jos_contact): with fetch (ajax=1) it answers in JSON, without
 * JavaScript it leads back to #kontakt of the front page.
 */
function jos_contact_send(): void {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- the nonce is checked below, before anything is sent.
	$ajax = ! empty( $_POST['ajax'] );
	$lang = isset( $_POST['lang'] ) ? sanitize_key( wp_unslash( $_POST['lang'] ) ) : 'de';
	$lang = array_key_exists( $lang, jos_languages() ) ? $lang : 'de';
	$say  = static function ( string $de ) use ( $lang ): string {
		return jos_strings()[ $lang ][ $de ] ?? $de;
	};
	$answer = static function ( bool $ok, string $message = '' ) use ( $ajax, $lang ): void {
		if ( $ajax ) {
			wp_send_json(
				array(
					'ok'      => $ok,
					'message' => $message,
				),
				$ok ? 200 : 400
			);
		}
		$url = jos_url( add_query_arg( 'kontakt', $ok ? 'gesendet' : 'fehler', home_url( '/' ) ), $lang );
		wp_safe_redirect( $url . '#kontakt' );
		exit;
	};

	$nonce = isset( $_POST['jos_contact_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['jos_contact_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'jos_contact' ) ) {
		$answer( false, $say( 'Die Seite war zu lange offen. Bitte lade sie neu und sende noch einmal.' ) );
	}

	// a filled hidden field or a form sent faster than a person can type: a bot, it gets the answer of a person
	$trap  = isset( $_POST['website'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['website'] ) ) ) : '';
	$since = isset( $_POST['since'] ) ? (int) $_POST['since'] : 0;
	if ( '' !== $trap || time() - $since < JOS_CONTACT_MIN_SECONDS ) {
		$answer( true );
	}

	// the name goes into the Reply-To header: one line, no signs that mean something there
	$name    = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
	$name    = trim( (string) preg_replace( '/[<>"\\\\,;:]/', '', mb_substr( $name, 0, 100 ) ) );
	$email   = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
	$message = isset( $_POST['message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['message'] ) ) : '';
	$message = trim( mb_substr( $message, 0, 5000 ) );
	// phpcs:enable WordPress.Security.NonceVerification.Missing

	if ( '' === $name || '' === $email || '' === $message ) {
		$answer( false, $say( 'Bitte fülle alle Felder aus.' ) );
	}
	if ( ! is_email( $email ) ) {
		$answer( false, $say( 'Bitte gib eine gültige E-Mail-Adresse ein.' ) );
	}

	$subject = sprintf( 'Nachricht von %s über die Website', $name );
	$body    = implode(
		"\n",
		array(
			'Name: ' . $name,
			'E-Mail: ' . $email,
			'Sprache: ' . strtoupper( $lang ),
			'',
			$message,
			'',
			sprintf( 'Gesendet über das Kontaktformular von %s am %s.', home_url( '/' ), wp_date( 'd.m.Y \u\m H:i' ) ),
		)
	);
	$sent = wp_mail( jos_contact_email(), $subject, $body, array( sprintf( 'Reply-To: %s <%s>', $name, $email ) ) );
	if ( ! $sent ) {
		$answer( false, $say( 'Die Nachricht konnte nicht gesendet werden. Bitte versuch es später noch einmal.' ) );
	}
	$answer( true );
}
add_action( 'admin_post_nopriv_jos_contact', 'jos_contact_send' );
add_action( 'admin_post_jos_contact', 'jos_contact_send' );
