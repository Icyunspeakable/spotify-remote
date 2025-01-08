const express = require('express')
const request = require('request')
const crypto = require('crypto')
const cors = require('cors')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')
const { futimesSync } = require('fs')
//const { log, getFormattedString } = require("../print.js")

const client_id = process.env.CLIENT_ID // Your client id
const client_secret = process.env.CLIENT_SECRET // Your secret
const redirect_uri = 'http://localhost/callback' // Your redirect uri

let shared_access_token = ''
let shared_refresh_token = ''

let currentTrackCached = {}

async function init(initData) {
	console.log('seppuku time <:')
	const generateRandomString = (length) => {
		return crypto.randomBytes(60).toString('hex').slice(0, length)
	}

	const stateKey = 'spotify_auth_state'

	const app = express()

	app.use(express.static(__dirname + '/public'))
		.use(cors())
		.use(cookieParser())

	app.get('/login', function (req, res) {
		const state = generateRandomString(16)
		res.cookie(stateKey, state)

		// your application requests authorization
		const scope =
			'user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing'
		res.redirect(
			'https://accounts.spotify.com/authorize?' +
				querystring.stringify({
					response_type: 'code',
					client_id: client_id,
					scope: scope,
					redirect_uri: redirect_uri,
					state: state,
				})
		)
	})

	// start the browser run a command in cmd
	// start chrome http://localhost:80/login
	//console.log("test")
	const { exec } = require('child_process')
	exec('start http://localhost/login', (err, stdout, stderr) => {
		if (err) {
			console.error(err)
			return
		}
		console.log(stdout)
	})

	async function updateCachedTrack() {
		currentTrackCached = await getcurrenttrack()
	}

	setInterval(updateCachedTrack, 1000)

	app.get('/current-track', async (req, res) => {
		const currentTrack = currentTrackCached // Ensure getcurrenttrack returns both trackArtist and trackName
		res.json(currentTrack)
	})
	app.listen(80)
	console.log('THIS SHIT IT BAKING')
	app.get('/callback', function (req, res) {
		// your application requests refresh and access tokens
		// after checking the state parameter

		const code = req.query.code || null
		const state = req.query.state || null
		const storedState = req.cookies ? req.cookies[stateKey] : null

		if (state === null || state !== storedState) {
			res.redirect(
				'/#' +
					querystring.stringify({
						error: 'state_mismatch',
					})
			)
		} else {
			res.clearCookie(stateKey)
			const authOptions = {
				url: 'https://accounts.spotify.com/api/token',
				form: {
					code: code,
					redirect_uri: redirect_uri,
					grant_type: 'authorization_code',
				},
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					Authorization:
						'Basic ' +
						new Buffer.from(
							client_id + ':' + client_secret
						).toString('base64'),
				},
				json: true,
			}

			request.post(authOptions, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					const access_token = body.access_token
					const refresh_token = body.refresh_token

					shared_access_token = access_token
					let totalms
					shared_refresh_token = refresh_token

					log('access_token', access_token)
					log('refresh_token', refresh_token)

					//afterCreds(access_token, refresh_token);

					// we can also pass the token to the browser to make requests from there
					// close the browser and run the command in cmd
					res.send('<script>window.close();</script>')
				} else {
					res.redirect(
						'/#' +
							querystring.stringify({
								error: 'invalid_token',
							})
					)
				}
			})
		}
	})

	async function refreshSpotifyToken() {
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				Authorization:
					'Basic ' +
					new Buffer.from(client_id + ':' + client_secret).toString(
						'base64'
					),
			},
			form: {
				grant_type: 'refresh_token',
				refresh_token: shared_refresh_token,
			},
			json: true,
		}

		request.post(authOptions, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				shared_access_token = body.access_token
				log(`{blue}Token refreshed successfully:`, shared_access_token)
			} else {
				console.error('Error refreshing token:', error || body)
			}
		})
	}

	setInterval(refreshSpotifyToken, 45 * 60 * 1000) // Refresh every 45 minutes

	app.get('/refresh_token', function (req, res) {
		const refresh_token = req.query.refresh_token
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				Authorization:
					'Basic ' +
					new Buffer.from(client_id + ':' + client_secret).toString(
						'base64'
					),
			},
			form: {
				grant_type: 'refresh_token',
				refresh_token: refresh_token,
			},
			json: true,
		}

		request.post(authOptions, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				const access_token = body.access_token,
					refresh_token = body.refresh_token
				res.send({
					access_token: access_token,
					refresh_token: refresh_token,
				})
			}
		})
	})
}

let lastTrack = ''

async function getcurrenttrack() {
	const Options = {
		url: 'https://api.spotify.com/v1/me/player',
		headers: {
			Authorization: 'Bearer ' + shared_access_token,
		},
		json: true,
	}
	const { error, response, body } = await new Promise((resolve, reject) => {
		request.get(Options, function (error, response, body) {
			resolve({ error, response, body })
		})
	})
	if (!body || !body.item) return
	const Trackid = body.item.id
	const trackName = body.item.name
	const trackArtist = body.item.artists[0].name
	const albumArt = body.item.album.images[0].url
	const progress_ms = body.progress_ms
	const duration_ms = body.item.duration_ms
	const volume = body.device.volume_percent
	const position = Math.round((progress_ms / duration_ms) * 1000)
	const min = Math.floor((duration_ms / 1000 / 60) << 0),
		sec = Math.floor((duration_ms / 1000) % 60)
	const minutes = Math.floor((progress_ms / 1000 / 60) << 0),
		seconds = Math.floor((progress_ms / 1000) % 60)
	if (sec < 10) var formattedSec = '0' + sec
	else var formattedSec = sec
	if (seconds < 10) var formattedSeconds = '0' + seconds
	else formattedSeconds = seconds
	const trackPosition = minutes + ':' + formattedSeconds
	const trackDuration = min + ':' + formattedSec
	if (Trackid == lastTrack)
		return {
			trackName,
			trackArtist,
			albumArt,
			Trackid,
			position,
			duration_ms,
			volume,
			trackPosition,
			trackDuration,
		}
	lastTrack = Trackid
	log(`{bold}{magenta}Now Playing ` + trackName + ` By ` + trackArtist)
	return {
		trackName,
		trackArtist,
		albumArt,
		Trackid,
		position,
		duration_ms,
		volume,
		trackPosition,
		trackDuration,
	}
}
setInterval(getcurrenttrack, 1000) //runs prior code every 1 sec

//async function getsongfullms(){
//  const Trackid = await getcurrenttrack();
//const Options = {
//url: 'https://api.spotify.com/v1/audio-features/'+ Trackid,
// headers: {
//     'Authorization' : 'Bearer ' + shared_access_token
// },
// json: true
// };
//const { error, response, body } = await new Promise((resolve, reject) => {
//  request.get(Options, function(error, response, body) { resolve({ error, response, body }); });
// });
// if(!body || !body.item) return
//const totalms = body.duration_ms;
// return {totalms, };
//}

let lastVolume

async function onIpc(event, message) {
	log('{yellow} IPC Message Received:', message)

	const access_token = shared_access_token
	const messages = ['play', 'next', 'pause', 'previous']
	if (messages.includes(message)) {
		try {
			const shouldPut = ['play', 'pause'].includes(message)
			const options = {
				url: 'https://api.spotify.com/v1/me/player/' + message,
				headers: {
					Authorization: 'Bearer ' + access_token,
				},

				json: true,
				method: shouldPut ? 'put' : 'post',
			}
			const { error, response, body } = await new Promise(
				(resolve, reject) => {
					request(options, function (error, response, body) {
						resolve({ error, response, body })
					})
				}
			)
			log('{blue}Command: ' + message)
		} catch (error) {
			console.error(message + ' error:', error)
		}
	}

	const volumeprefix = 'volume'

	if (message.startsWith(volumeprefix)) {
		const volumeValue = message.slice(volumeprefix.length)
		const formattedInt = parseInt(volumeValue)
		if (formattedInt != lastVolume) {
			lastVolume = formattedInt
			const volumeOptions = {
				url:
					'https://api.spotify.com/v1/me/player/volume?volume_percent=' +
					formattedInt,
				headers: {
					Authorization: 'Bearer ' + access_token,
				},
				json: true,
			}
			await new Promise((resolve, reject) => {
				request.put(volumeOptions, (error, response, body) => {
					if (error) reject(error)
					else resolve({ error, response, body })
				})
			})
			log(`{blue}Volume changed to ` + formattedInt)
		}
	}

	const seekprefix = 'time'
	if (message.startsWith(seekprefix)) {
		const seekValue = message.slice(seekprefix.length)
		const formattedNum = parseInt(seekValue)

		const target_ms = Math.round(
			(formattedNum / 1000) * currentTrackCached.duration_ms
		)
		log('{blue} seek to', target_ms)
		const seekOptions = {
			url:
				'https://api.spotify.com/v1/me/player/seek?position_ms=' +
				target_ms, //if you can read this I'm going to miss you
			headers: {
				Authorization: 'Bearer ' + access_token,
			},
			json: true,
		}
		await new Promise((resolve, reject) => {
			request.put(seekOptions, (error, response, body) => {
				if (error) reject(error)
				else resolve({ error, response, body })
			})
		})
		log(`{blue}Position changed to ` + target_ms)
	}
}
module.exports = {
	onIpc,
	init,
}
