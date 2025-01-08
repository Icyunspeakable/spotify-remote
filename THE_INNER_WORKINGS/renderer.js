document.addEventListener('DOMContentLoaded', () => {
	const playButton = document.getElementById('play')
	const pauseButton = document.getElementById('pause')
	const nextButton = document.getElementById('next')
	const prevButton = document.getElementById('prev')
	const loopButton = document.getElementById('loop')
	const slider = document.getElementById('volume')
	const seek = document.getElementById('seek')
	const artistElement = document.getElementById('artist')
	const songElement = document.getElementById('song')
	const albumArtElement = document.getElementById('albumArtElement')
	const position = document.getElementById('myRange')
	const volume = document.getElementById('volume')
	const positionText = document.getElementById('current')
	const durationText = document.getElementById('total')
	const Mode = document.getElementById('stylesheet')
	const themeSwitcher = document.getElementById('themeSwitcher')

	async function fetchCurrentTrack() {
		try {
			const response = await fetch('http://localhost/current-track')
			const data = await response.json()

			if (
				data.trackName &&
				data.trackArtist &&
				data.albumArt &&
				data.position &&
				data.volume &&
				data.trackPosition &&
				data.trackDuration
			) {
				songElement.textContent = data.trackName
				artistElement.textContent = data.trackArtist
				albumArtElement.src = data.albumArt
				position.value = data.position
				volume.value = data.volume
				positionText.textContent = data.trackPosition
				durationText.textContent = data.trackDuration
			}
		} catch (error) {
			console.error('Error fetching current track:', error)
		}
	}

	// Fetch current track immediately and then every few seconds
	fetchCurrentTrack()
	setInterval(fetchCurrentTrack, 1000)

	slider.addEventListener('input', (event) => {
		const volume = slider.value
		window.api.send('spotify', 'volume' + volume)
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

	seek.addEventListener('input', (event) => {
		const time = position.value
		window.api.send('spotify', 'time' + time)
	})
})
