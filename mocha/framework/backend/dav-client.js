/**
 * DAV Request Helper
 * Makes raw CalDAV/CardDAV/WebDAV HTTP requests (PROPFIND, PUT, DELETE, COPY, REPORT, OPTIONS)
 * with Basic Auth to /dav/ and /principals/ endpoints.
 */
import config from '../../conf/config.js';

/**
 * Make a raw DAV HTTP request.
 * @param {Object} options
 * @param {string} options.method - HTTP method (PROPFIND, PUT, DELETE, COPY, REPORT, OPTIONS, etc.)
 * @param {string} options.uri - Request URI (e.g. /dav/user@domain/Calendar/)
 * @param {string} options.user - Email address for Basic Auth
 * @param {string} options.password - Password for Basic Auth
 * @param {string} [options.body] - XML body for the request
 * @param {string} [options.depth] - DAV Depth header (0, 1, infinity)
 * @param {Object} [options.headers] - Additional headers
 * @param {string} [options.server] - Override server host
 * @returns {Object} { status, statusText, body, text }
 */
async function makeDavRequest(options) {
	const {
		method,
		uri,
		user,
		password,
		body = null,
		depth = null,
		headers = {},
		server = null,
	} = options;

	const host = server || config.serverHost;
	const port = config.clientPort || '443';
	const url = `https://${host}:${port}${uri}`;

	const authString = Buffer.from(`${user}:${password}`).toString('base64');
	const requestHeaders = {
		'Authorization': `Basic ${authString}`,
		...headers,
	};

	// Set default Content-Type only if caller hasn't provided one
	if (body && !requestHeaders['Content-Type']) {
		requestHeaders['Content-Type'] = 'text/xml; charset=utf-8';
	}

	if (depth !== null) {
		requestHeaders['Depth'] = String(depth);
	}

	const fetchOptions = {
		method,
		headers: requestHeaders,
	};

	if (body) {
		const isXml = !requestHeaders['Content-Type']
			|| requestHeaders['Content-Type'].includes('xml');
		if (isXml) {
			// Strip leading whitespace from each line (template literal indentation)
			let cleanBody = body.split('\n').map(l => l.trim()).filter(l => l).join('\n');
			// Auto-add XML declaration if not present
			if (!cleanBody.startsWith('<?xml')) {
				cleanBody = '<?xml version="1.0" encoding="utf-8"?>\n' + cleanBody;
			}
			fetchOptions.body = cleanBody;
		} else {
			fetchOptions.body = body;
		}
	}

	const response = await fetch(url, fetchOptions);
	const text = await response.text();

	return {
		status: response.status,
		statusText: response.statusText,
		text,
		headers: response.headers,
	};
}

export default makeDavRequest;
