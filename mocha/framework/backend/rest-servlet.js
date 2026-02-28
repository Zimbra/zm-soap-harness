/**
 * REST Servlet - Utility functions for Zimbra REST servlet requests
 * Extracted from soap-common.js for use in rest-servlet tests.
 */

import fs from 'fs';
import path from 'path';
import config from '../../conf/config.js';

/**
 * Make a GET request to the Zimbra REST servlet.
 * @param {string} authToken - Account auth token (used as cookie). Pass null/empty for unauthenticated requests.
 * @param {object} options - Request options
 * @param {string} options.user - Account email whose mailbox to access (used in URL path)
 * @param {string} [options.id] - Item ID to retrieve
 * @param {string} [options.fmt] - Response format (sync, ics, csv, json, tgz, rss, html, vcf, etc.)
 * @param {string} [options.folder] - Folder path (e.g. 'Inbox', 'calendar')
 * @param {string} [options.auth] - Auth mode override ('ba' for basic auth, 'co' for cookie)
 * @param {string} [options.query] - Search query string
 * @param {string} [options.view] - View type
 * @param {string} [options.guest] - Guest email for guest auth
 * @param {string} [options.password] - Guest password for guest auth
 * @param {object} [options.extraParams] - Additional query params as key-value pairs
 * @param {boolean} [options.returnBuffer] - If true, return body as Buffer instead of text
 * @returns {Promise<{status: number, headers: object, body: string|Buffer}>}
 */
async function makeRestRequest(authToken, options = {}) {
	const params = new URLSearchParams();
	if (options.id) params.set('id', options.id);
	if (options.fmt) params.set('fmt', options.fmt);
	if (options.auth) params.set('auth', options.auth);
	if (options.query) params.set('query', options.query);
	if (options.view) params.set('view', options.view);
	if (options.zauthtoken) params.set('zauthtoken', options.zauthtoken);
	if (options.extraParams) {
		for (const [key, value] of Object.entries(options.extraParams)) {
			params.set(key, value);
		}
	}

	const userPart = options.user || '~';
	const folderPart = options.folder ? `/${options.folder}` : '';
	const queryString = params.toString() ? `?${params.toString()}` : '';
	const url = `https://${config.serverHost}:${config.clientPort}/home/${userPart}${folderPart}${queryString}`;

	const headers = {};
	if (authToken) {
		headers['Cookie'] = `ZM_AUTH_TOKEN=${authToken}`;
	}
	if (options.guest && options.password) {
		const credentials = Buffer.from(`${options.guest}:${options.password}`).toString('base64');
		headers['Authorization'] = `Basic ${credentials}`;
	}

	const response = await fetch(url, {
		method: 'GET',
		headers,
		redirect: 'manual'
	});

	const responseHeaders = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	const body = options.returnBuffer
		? Buffer.from(await response.arrayBuffer())
		: await response.text();

	return { status: response.status, headers: responseHeaders, body };
}

/**
 * Make a POST request to the Zimbra REST servlet (for importing files).
 * @param {string} authToken - Account auth token (used as cookie)
 * @param {object} options - Request options
 * @param {string} options.user - Account email whose mailbox to access
 * @param {string} [options.filePath] - Path to file to upload
 * @param {Buffer} [options.fileBuffer] - Raw buffer to upload (alternative to filePath)
 * @param {string} [options.fmt] - Format (ics, csv, tgz, etc.)
 * @param {string} [options.folder] - Target folder path
 * @param {string} [options.resolve] - Conflict resolution strategy (skip, modify, replace, reset)
 * @param {object} [options.extraParams] - Additional query params
 * @returns {Promise<{status: number, headers: object, body: string}>}
 */
async function makeRestPostRequest(authToken, options = {}) {
	const params = new URLSearchParams();
	if (options.fmt) params.set('fmt', options.fmt);
	if (options.resolve) params.set('resolve', options.resolve);
	if (options.extraParams) {
		for (const [key, value] of Object.entries(options.extraParams)) {
			params.set(key, value);
		}
	}

	const userPart = options.user || '~';
	const folderPart = options.folder ? `/${options.folder}` : '';
	const queryString = params.toString() ? `?${params.toString()}` : '';
	const url = `https://${config.serverHost}:${config.clientPort}/home/${userPart}${folderPart}${queryString}`;

	let body;
	let contentType;
	if (options.filePath) {
		body = fs.readFileSync(options.filePath);
		const ext = path.extname(options.filePath).toLowerCase();
		const mimeMap = {
			'.ics': 'text/calendar',
			'.csv': 'text/csv',
			'.vcf': 'text/vcard',
			'.tgz': 'application/x-tar-gz',
			'.tar.gz': 'application/x-tar-gz',
			'.eml': 'message/rfc822',
			'.msg': 'message/rfc822'
		};
		contentType = mimeMap[ext] || 'application/octet-stream';
	} else if (options.fileBuffer) {
		body = options.fileBuffer;
		contentType = options.contentType || 'application/octet-stream';
	}

	const headers = {
		'Cookie': `ZM_AUTH_TOKEN=${authToken}`,
		'Content-Type': contentType
	};

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body,
		redirect: 'manual'
	});

	const responseHeaders = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	const responseBody = await response.text();
	return { status: response.status, headers: responseHeaders, body: responseBody };
}

/**
 * Make a GET request to the Zimbra FreeBusy IFB endpoint.
 * @param {string} authToken - Account auth token (used as cookie). Pass null/empty for unauthenticated requests.
 * @param {object} options - Request options
 * @param {string} options.acct - Account email to query free/busy for
 * @param {string} [options.s] - Start time in milliseconds
 * @param {string} [options.e] - End time in milliseconds
 * @param {object} [options.extraParams] - Additional query params as key-value pairs
 * @returns {Promise<{status: number, headers: object, body: string}>}
 */
async function makeFreeBusyRequest(authToken, options = {}) {
	const params = new URLSearchParams();
	if (options.acct) params.set('acct', options.acct);
	if (options.s) params.set('s', options.s);
	if (options.e) params.set('e', options.e);
	if (options.extraParams) {
		for (const [key, value] of Object.entries(options.extraParams)) {
			params.set(key, value);
		}
	}

	const queryString = params.toString() ? `?${params.toString()}` : '';
	const url = `https://${config.serverHost}:${config.clientPort}/service/pubcal/freebusy.ifb${queryString}`;

	const headers = {};
	if (authToken) {
		headers['Cookie'] = `ZM_AUTH_TOKEN=${authToken}`;
	}

	const response = await fetch(url, {
		method: 'GET',
		headers,
		redirect: 'manual'
	});

	const responseHeaders = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	const body = await response.text();
	return { status: response.status, headers: responseHeaders, body };
}

export { makeRestRequest, makeRestPostRequest, makeFreeBusyRequest };
export default { makeRestRequest, makeRestPostRequest, makeFreeBusyRequest };
