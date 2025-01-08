const colors = {
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
}

const modifiers = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	underline: '\x1b[4m',
}

const combinedDict = { ...colors, ...modifiers }

/**
 * @param {string} msg
 * @returns {string}
 */
function getFormattedString(msg) {
	const tagRegex = /\{(\w+)\}/g
	for (const match of msg.matchAll(tagRegex)) {
		const color = combinedDict[match[1]]
		if (!color) {
			continue
		}
		msg = msg.replace(match[0], color)
	}
	return msg // Return the formatted string
}

/**
 * @param  {...string} msgs
 * @returns {void}
 */
function log(...msgs) {
	const msg = msgs[0]
	const time = new Date()
	const timeStr = `{bold}{green}[${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}] {reset}`
	console.log(getFormattedString(timeStr + msg), ...msgs.slice(1))
}

module.exports = {
	log,
	getFormattedString,
}
