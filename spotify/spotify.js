const express = require('express')
const request = require('request')
const crypto = require('crypto')
const cors = require('cors')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')
const path = require('path')

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

const SERVER_PORT = 8000
const SERVER_ORIGIN = `http://127.0.0.1:${SERVER_PORT}`
const redirect_uri = `${SERVER_ORIGIN}/callback`

let shared_access_token = ''
let shared_refresh_token = ''

let currentTrackCached = {}
let recentTracksCached = []
/** @type {Record<string, boolean>} */
let likedByTrackId = {}

const RECENT_LIMIT = 15
const RECENT_REFRESH_MS = 20_000

function spotifyRequest(method, url, opts = {}) {
	const { headers: optsHeaders, ...rest } = opts
	return new Promise((resolve) => {
		request(
			{
				method,
				url,
				json: true,
				...rest,
				headers: {
					Authorization: 'Bearer ' + shared_access_token,
					...(optsHeaders || {}),
				},
			},
			(error, response, body) => resolve({ error, response, body })
		)
	})
}

async function fetchTracksSaved(ids) {
	if (!shared_access_token || !ids.length) return
	const unique = [...new Set(ids.filter(Boolean))].slice(0, 50)
	if (!unique.length) return
	const url =
		'https://api.spotify.com/v1/me/tracks/contains?ids=' +
		unique.join(',')
	const { response, body } = await spotifyRequest('GET', url)
	if (!response || response.statusCode !== 200 || !Array.isArray(body)) return
	unique.forEach((id, i) => {
		likedByTrackId[id] = body[i]
	})
}

async function refreshRecentTracks() {
	if (!shared_access_token) return
	const { response, body } = await spotifyRequest(
		'GET',
		'https://api.spotify.com/v1/me/player/recently-played?limit=' +
			RECENT_LIMIT
	)
	if (!response || response.statusCode !== 200 || !body.items) return

	const tracks = body.items
		.map((row) => {
			const t = row.track
			if (!t || !t.id) return null
			const img =
				t.album && t.album.images && t.album.images[0]
					? t.album.images[0].url
					: ''
			return {
				Trackid: t.id,
				trackName: t.name,
				trackArtist:
					t.artists && t.artists[0] ? t.artists[0].name : '',
				albumName: (t.album && t.album.name) || '',
				albumArt: img,
				played_at: row.played_at,
			}
		})
		.filter(Boolean)

	const likeIds = [...tracks.map((t) => t.Trackid)]
	if (currentTrackCached.Trackid) likeIds.push(currentTrackCached.Trackid)
	await fetchTracksSaved(likeIds)

	recentTracksCached = tracks.map((t) => ({
		...t,
		is_liked:
			typeof likedByTrackId[t.Trackid] === 'boolean'
				? likedByTrackId[t.Trackid]
				: null,
	}))
}

async function init(initData) {
	console.log('seppuku time <:')
	const generateRandomString = (length) => {
		return crypto.randomBytes(60).toString('hex').slice(0, length)
	}

	const stateKey = 'spotify_auth_state'

	const app = express()

	app
		.use(express.static(path.join(__dirname, 'public')))
		.use('/widget', express.static(path.join(__dirname, '..', 'widget')))
		.use(cors())
		.use(cookieParser())

	const scopes = [
		'user-read-private',
		'user-read-email',
		'user-read-playback-state',
		'user-modify-playback-state',
		'user-read-currently-playing',
		'user-read-recently-played',
		'user-library-read',
	].join(' ')

	app.get('/login', function (req, res) {
		const state = generateRandomString(16)
		res.cookie(stateKey, state)

		res.redirect(
			'https://accounts.spotify.com/authorize?' +
				querystring.stringify({
					response_type: 'code',
					client_id: client_id,
					scope: scopes,
					redirect_uri: redirect_uri,
					state: state,
				})
		)
	})

	const { exec } = require('child_process')
	exec(`start ${SERVER_ORIGIN}/login`, (err, stdout, stderr) => {
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
	setInterval(refreshRecentTracks, RECENT_REFRESH_MS)
	refreshRecentTracks().catch(() => {})

	app.get('/current-track', (req, res) => {
		res.json(
			currentTrackCached && Object.keys(currentTrackCached).length
				? currentTrackCached
				: {}
		)
	})

	app.get('/recent-tracks', (req, res) => {
		res.json({ tracks: recentTracksCached })
	})

	app.get('/widget-data', (req, res) => {
		res.json({
			current:
				currentTrackCached && Object.keys(currentTrackCached).length
					? currentTrackCached
					: {},
			recent: recentTracksCached,
			updated_at: new Date().toISOString(),
		})
	})

	app.listen(SERVER_PORT, () => {
		console.log(`THIS SHIT IT BAKING → ${SERVER_ORIGIN}`)
	})

	app.get('/callback', function (req, res) {
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
						Buffer.from(client_id + ':' + client_secret).toString(
							'base64'
						),
				},
				json: true,
			}

			request.post(authOptions, function (error, response, body) {
				if (!error && response.statusCode === 200) {
					const access_token = body.access_token
					const refresh_token = body.refresh_token

					shared_access_token = access_token
					shared_refresh_token = refresh_token

					log('access_token', access_token)
					log('refresh_token', refresh_token)

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
					Buffer.from(client_id + ':' + client_secret).toString(
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

	setInterval(refreshSpotifyToken, 45 * 60 * 1000)

	app.get('/refresh_token', function (req, res) {
		const refresh_token = req.query.refresh_token
		const authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				Authorization:
					'Basic ' +
					Buffer.from(client_id + ':' + client_secret).toString(
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
	if (!shared_access_token) return {}

	const Options = {
		url: 'https://api.spotify.com/v1/me/player',
		headers: {
			Authorization: 'Bearer ' + shared_access_token,
		},
		json: true,
	}
	const { response, body } = await new Promise((resolve) => {
		request.get(Options, function (error, response, body) {
			resolve({ error, response, body })
		})
	})

	if (!response || response.statusCode === 204 || !body) return {}

	if (!body.item) {
		const out = { is_playing: !!body.is_playing }
		if (body.device && body.device.volume_percent != null)
			out.volume = body.device.volume_percent
		return out
	}

	const item = body.item
	const Trackid = item.id
	const trackName = item.name
	const trackArtist =
		item.artists && item.artists[0] ? item.artists[0].name : ''

	let albumArt = ''
	if (item.album && item.album.images && item.album.images[0])
		albumArt = item.album.images[0].url
	else if (item.images && item.images[0]) albumArt = item.images[0].url

	const progress_ms = body.progress_ms ?? 0
	const duration_ms = item.duration_ms || 1
	const volume =
		body.device && body.device.volume_percent != null
			? body.device.volume_percent
			: undefined
	const position = Math.round((progress_ms / duration_ms) * 1000)
	const min = Math.floor((duration_ms / 1000 / 60) << 0),
		sec = Math.floor((duration_ms / 1000) % 60)
	const minutes = Math.floor((progress_ms / 1000 / 60) << 0),
		seconds = Math.floor((progress_ms / 1000) % 60)
	let formattedSec = sec < 10 ? '0' + sec : String(sec)
	let formattedSeconds = seconds < 10 ? '0' + seconds : String(seconds)
	const trackPosition = minutes + ':' + formattedSeconds
	const trackDuration = min + ':' + formattedSec

	if (Trackid !== lastTrack) {
		lastTrack = Trackid
		log(`{bold}{magenta}Now Playing ` + trackName + ` By ` + trackArtist)
		fetchTracksSaved([Trackid]).catch(() => {})
	}

	const albumName = (item.album && item.album.name) || ''

	return {
		trackName,
		trackArtist,
		albumName,
		albumArt,
		Trackid,
		position,
		duration_ms,
		progress_ms,
		volume,
		trackPosition,
		trackDuration,
		is_playing: !!body.is_playing,
		is_liked:
			typeof likedByTrackId[Trackid] === 'boolean'
				? likedByTrackId[Trackid]
				: null,
	}
}

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
				target_ms,
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
