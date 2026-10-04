// Local only (functions.php, jos_dev_reload): when the sync has copied new theme files into Local,
// the page reloads by itself. It asks every two seconds for the time of the newest theme file and
// reloads once that time has changed and then stayed the same for one more round (copy finished).
(() => {
	const url = window.josDevReload && window.josDevReload.url;
	if (!url) return;

	let first = null;
	let seen = null;

	const check = async () => {
		if (document.hidden) return;
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (!response.ok) return;
			const { stamp } = await response.json();
			if (first === null) {
				first = stamp;
			} else if (stamp !== first && stamp === seen) {
				window.location.reload();
				return;
			}
			seen = stamp;
		} catch (e) {
			// Local is restarting: try again in the next round
		}
	};

	check();
	setInterval(check, 2000);
	document.addEventListener('visibilitychange', check);
})();
