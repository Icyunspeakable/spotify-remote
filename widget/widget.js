const POLL_MS = 1000
const API = 'http://127.0.0.1:8000/widget-data'

function likedClass(isLiked) {
  if (isLiked === true) return 'on'
  if (isLiked === false) return ''
  return 'dim'
}

function formatMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function updateProgress(cur) {
  const posEl = document.getElementById('posTime')
  const durEl = document.getElementById('durTime')
  const fillEl = document.getElementById('progressFill')
  const trackEl = document.getElementById('progressTrack')

  if (
    !cur.trackName ||
    !Number.isFinite(cur.duration_ms) ||
    cur.duration_ms <= 0 ||
    !Number.isFinite(cur.progress_ms)
  ) {
    posEl.textContent = '0:00'
    durEl.textContent = '0:00'
    fillEl.style.width = '0%'
    trackEl.setAttribute('aria-valuenow', '0')
    return
  }

  const posLabel =
    cur.trackPosition != null && cur.trackPosition !== ''
      ? cur.trackPosition
      : formatMs(cur.progress_ms)
  const durLabel =
    cur.trackDuration != null && cur.trackDuration !== ''
      ? cur.trackDuration
      : formatMs(cur.duration_ms)

  posEl.textContent = posLabel
  durEl.textContent = durLabel

  const pct = Math.min(
    100,
    Math.max(0, (cur.progress_ms / cur.duration_ms) * 100)
  )
  fillEl.style.width = `${pct}%`
  trackEl.setAttribute('aria-valuenow', String(Math.round(pct)))
}

function render(data) {
  const cur = data.current || {}
  const art = document.getElementById('art')
  const titleEl = document.getElementById('title')
  const subtitleEl = document.getElementById('subtitle')
  const stateEl = document.getElementById('state')
  const likedEl = document.getElementById('liked')
  const listEl = document.getElementById('list')

  updateProgress(cur)

  if (cur.trackName) {
    titleEl.textContent = cur.trackName
    subtitleEl.textContent = [cur.trackArtist, cur.albumName]
      .filter(Boolean)
      .join(' · ')
    if (cur.albumArt) {
      art.src = cur.albumArt
      art.hidden = false
    } else {
      art.hidden = true
    }
    stateEl.textContent = cur.is_playing ? 'Playing' : 'Paused'
    stateEl.className = 'state' + (cur.is_playing ? '' : ' paused')
    if (cur.is_liked === null || cur.is_liked === undefined) {
      likedEl.hidden = true
    } else {
      likedEl.hidden = false
      likedEl.className =
        'liked' + (cur.is_liked === true ? '' : ' dim')
    }
  } else {
    titleEl.textContent = 'Nothing playing'
    subtitleEl.textContent = ''
    art.hidden = true
    stateEl.textContent = ''
    likedEl.hidden = true
  }

  const recent = data.recent || []
  listEl.innerHTML = recent
    .map((t) => {
      const heart =
        t.is_liked === null || t.is_liked === undefined
          ? '<span class="heart dim">♡</span>'
          : `<span class="heart ${likedClass(t.is_liked)}">${t.is_liked ? '♥' : '♡'}</span>`
      const img = t.albumArt
        ? `<img src="${escapeAttr(t.albumArt)}" alt="" />`
        : '<span></span>'
      return `<li>${img}<div class="t-main"><div class="t-title">${escapeHtml(t.trackName || '')}</div><div class="t-artist">${escapeHtml(t.trackArtist || '')}</div></div>${heart}</li>`
    })
    .join('')
}

function escapeHtml(s) {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

async function tick() {
  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error(String(res.status))
    render(await res.json())
  } catch (e) {
    document.getElementById('title').textContent = 'Waiting for backend…'
    document.getElementById('subtitle').textContent = String(e.message || e)
    document.getElementById('list').innerHTML = ''
    updateProgress({})
  }
}

tick()
setInterval(tick, POLL_MS)
