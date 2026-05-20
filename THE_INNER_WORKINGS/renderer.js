document.addEventListener('DOMContentLoaded', () => {
	const playButton = document.getElementById('play')
	const pauseButton = document.getElementById('pause')
	const nextButton = document.getElementById('next')
	const prevButton = document.getElementById('prev')
	const likeButton = document.getElementById('like')
	const slider = document.getElementById('volume')
	const artistElement = document.getElementById('artist')
	const songElement = document.getElementById('song')
	const albumArtElement = document.getElementById('albumArtElement')
	const seekSlider = document.getElementById('myRange')
	const volume = document.getElementById('volume')
	const positionText = document.getElementById('current')
	const durationText = document.getElementById('total')
	const themeSwitcher = document.getElementById('themeSwitcher')

	const THEME_ORIGIN = 'http://127.0.0.1:8000'

	let lastDurationMs = 0
	let seekDragging = false
	let currentTrackId = ''

	function syncVolumeSliderDisplay(val) {
		const n = Math.min(100, Math.max(0, Number(val)))
		slider.style.setProperty('--vol-pct', `${n}%`)
		slider.setAttribute('aria-valuenow', String(n))
		slider.setAttribute('aria-valuetext', `${n}% volume`)
	}

	syncVolumeSliderDisplay(volume.value)

	function applyUiTheme(theme) {
		const dark = theme === 'dark'
		document.documentElement.classList.toggle('dark', dark)
		themeSwitcher.textContent = dark ? 'Light mode' : 'Dark mode'
	}

	function themeFromPayload(data) {
		return data.uiTheme === 'dark' ? 'dark' : 'light'
	}

	async function postUiTheme(theme) {
		try {
			await fetch(`${THEME_ORIGIN}/ui-theme`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ theme }),
			})
		} catch (_) {}
	}

	themeSwitcher.addEventListener('click', async () => {
		const next = document.documentElement.classList.contains('dark')
			? 'light'
			: 'dark'
		applyUiTheme(next)
		await postUiTheme(next)
	})

	function formatMs(ms) {
		if (!Number.isFinite(ms) || ms < 0) ms = 0
		const totalSec = Math.floor(ms / 1000)
		const m = Math.floor(totalSec / 60)
		const s = totalSec % 60
		return m + ':' + s.toString().padStart(2, '0')
	}

	function sliderFromProgress(progress_ms, duration_ms) {
		if (!duration_ms) return 0
		return Math.round((progress_ms / duration_ms) * 1000)
	}

	async function fetchCurrentTrack() {
		try {
			const response = await fetch(
				'http://127.0.0.1:8000/current-track'
			)
			const data = await response.json()

			applyUiTheme(themeFromPayload(data))

			const hasTrack = Boolean(data.trackName)
			const hasProgress =
				hasTrack &&
				Number.isFinite(data.duration_ms) &&
				data.duration_ms > 0 &&
				Number.isFinite(data.progress_ms)

			if (hasTrack) {
				songElement.textContent = data.trackName
				artistElement.textContent = data.trackArtist || ''
				if (data.albumArt) {
					albumArtElement.src = data.albumArt
					albumArtElement.hidden = false
				} else {
					albumArtElement.removeAttribute('src')
					albumArtElement.hidden = true
				}
				if (data.volume != null) {
					volume.value = data.volume
					syncVolumeSliderDisplay(data.volume)
				}
				currentTrackId = data.trackId || data.Trackid
			} else {
				songElement.textContent = 'Nothing playing'
				artistElement.textContent = 'Start playback in Spotify'
				albumArtElement.removeAttribute('src')
				albumArtElement.hidden = true
			}

			if (hasProgress) {
				lastDurationMs = data.duration_ms
				durationText.textContent =
					data.trackDuration || formatMs(data.duration_ms)
				if (!seekDragging) {
					const tick = sliderFromProgress(
						data.progress_ms,
						data.duration_ms
					)
					seekSlider.value = String(
						Math.min(1000, Math.max(0, tick))
					)
					positionText.textContent =
						data.trackPosition || formatMs(data.progress_ms)
				}
			} else if (!seekDragging) {
				lastDurationMs = 0
				seekSlider.value = '0'
				positionText.textContent = '0:00'
				durationText.textContent = '0:00'
			}
		} catch (error) {
			console.error('Error fetching current track:', error)
		}
	}

	fetchCurrentTrack()
	setInterval(fetchCurrentTrack, 1000)

	seekSlider.addEventListener('pointerdown', () => {
		seekDragging = true
	})
	window.addEventListener('pointerup', () => {
		seekDragging = false
	})

	seekSlider.addEventListener('input', () => {
		if (!lastDurationMs) return
		const ms = (Number(seekSlider.value) / 1000) * lastDurationMs
		positionText.textContent = formatMs(ms)
	})

	seekSlider.addEventListener('change', () => {
		window.api.send('spotify', 'time' + seekSlider.value)
	})

	slider.addEventListener('input', () => {
		syncVolumeSliderDisplay(slider.value)
		window.api.send('spotify', 'volume' + slider.value)
	})

	playButton.addEventListener('click', () => {
		window.api.send('spotify', 'play')
	})

	pauseButton.addEventListener('click', () => {
		window.api.send('spotify', 'pause')
	})

	nextButton.addEventListener('click', () => {
		window.api.send('spotify', 'next')
	})

	prevButton.addEventListener('click', () => {
		window.api.send('spotify', 'previous')
	})

	likeButton.addEventListener('click', () => {
		if (!currentTrackId) {
			console.error('error no track id')
			return
		}
		window.api.send('spotify', 'like' + ' ' + currentTrackId)
	})
})
