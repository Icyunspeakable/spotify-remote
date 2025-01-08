/* const currentTimeElement = document.querySelector('.current-time');
const totalTimeElement = document.querySelector('.total-time');
const songElement = document.querySelector('.song');
const artistElement = document.querySelector('.artist');
const albumArtElement = document.querySelector('.album-art');
const seekBar = document.querySelector('.seek');
const position = document.querySelector('.position')

const playButton = document.getElementById('play');
const pauseButton = document.getElementById('pause');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const loopButton = document.getElementById('loop');

playButton.addEventListener('click', play);
pauseButton.addEventListener('click', pause);
nextButton.addEventListener('click', next);
prevButton.addEventListener('click', previous);
loopButton.addEventListener('click', toggleLoop);

async function fetchCurrentTrack() {
    try {
        const response = await fetch('http://localhost/current-track');
        const data = await response.json();
        
        // Update HTML elements with the current track data
        artistElement.textContent = data.trackArtist;
        songElement.textContent = data.trackName;
        albumArtElement.src = data.albumArt;
        position.value = data.position;
        
    } catch (error) {
        console.error('Error fetching current track:', error);
    }
}

// get track
fetchCurrentTrack();


setInterval(fetchCurrentTrack, 5000); // refresh 5 secs
 */
