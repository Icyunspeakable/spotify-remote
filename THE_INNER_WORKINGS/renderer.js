document.addEventListener('DOMContentLoaded', () => {
	const playButton = document.getElementById('play')
	const pauseButton = document.getElementById('pause')
	const nextButton = document.getElementById('next')
	const prevButton = document.getElementById('prev')
	const loopButton = document.getElementById('loop')
	const slider = document.getElementById('volume')
	const artistElement = document.getElementById('artist')
	const songElement = document.getElementById('song')
	const albumArtElement = document.getElementById('albumArtElement')
	const seekSlider = document.getElementById('myRange')
	const volume = document.getElementById('volume')
	const positionText = document.getElementById('current')
	const durationText = document.getElementById('total')
	const themeSwitcher = document.getElementById('themeSwitcher')

	let lastDurationMs = 0
	let seekDragging = false

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
				if (data.volume != null) volume.value = data.volume
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

	loopButton.addEventListener('click', () => {
		window.api.send('spotify', 'toggleloop')
	})
})
