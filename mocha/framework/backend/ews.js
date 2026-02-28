import config from '../../conf/config.js';
import common from '../core/common.js';
import ewsClient from 'ews-javascript-api';
import xml2js from 'xml2js';
import https from 'node:https';

const exchangeService = new ewsClient.ExchangeService(ewsClient.ExchangeVersion.Exchange2013);
exchangeService.Url = new ewsClient.Uri(`https://${config.serverHost}:${config.clientPort}/EWS/Exchange.asmx?wsdl`);
let messageSentStatus = false;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// XML parser options for EWS responses
const xmlParserOptions = {
	explicitArray: false,
	ignoreAttrs: false,
	tagNameProcessors: [xml2js.processors.stripPrefix],
	attrNameProcessors: [xml2js.processors.stripPrefix]
};

/**
 * Parse raw EWS XML response into a JS object.
 * Strips namespace prefixes for easy access.
 */
async function parseEWSResponse(xmlString) {
	const parser = new xml2js.Parser(xmlParserOptions);
	const result = await parser.parseStringPromise(xmlString);
	return result;
}

/**
 * Navigate a parsed EWS response to find the ResponseMessage.
 * EWS responses follow: Envelope > Body > XxxResponse > ResponseMessages > XxxResponseMessage
 */
function getResponseMessage(parsed, responseName) {
	const body = parsed?.Envelope?.Body;
	if (!body) return null;

	const response = body[responseName];
	if (!response) return null;

	const messages = response.ResponseMessages;
	if (!messages) return response;

	// Find the first *ResponseMessage key
	const msgKey = Object.keys(messages).find(k => k.endsWith('ResponseMessage'));
	if (!msgKey) return messages;

	const msg = messages[msgKey];
	return Array.isArray(msg) ? msg : [msg];
}

const ews = {
	/**
	 * Send a raw EWS SOAP request to the server.
	 * @param {string} ewsBody - The EWS operation XML (inside soap:Body)
	 * @param {string} username - Account email for Basic Auth
	 * @param {string} password - Account password for Basic Auth
	 * @returns {object} Parsed XML response as JS object (full Envelope)
	 */
	async makeEWSRequest(ewsBody, username, password) {
		const ewsUrl = `https://${config.serverHost}:${config.clientPort}/EWS/Exchange.asmx`;
		const soapEnvelope =
			`<?xml version="1.0" encoding="utf-8"?>
			<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
				<soap:Body>
					${ewsBody}
				</soap:Body>
			</soap:Envelope>`;

		const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
		const maxRetries = 5;
		const delayMs = 2000;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(ewsUrl, {
					agent: httpsAgent,
					method: 'POST',
					headers: {
						'Content-Type': 'text/xml; charset=utf-8',
						'Authorization': authHeader
					},
					body: soapEnvelope
				});

				const xmlText = await response.text();
				const parsed = await parseEWSResponse(xmlText);
				return parsed;

			} catch (error) {
				if (attempt < maxRetries) {
					common.log(`EWS request retry ${attempt}/${maxRetries}: ${error.message}`);
					await new Promise(resolve => setTimeout(resolve, delayMs));
					continue;
				}
				throw new Error(`EWS request failed after ${maxRetries} retries: ${error.message}`);
			}
		}
	},

	/**
	 * Helper: Extract response messages from a parsed EWS response.
	 * @param {object} parsed - Full parsed EWS Envelope
	 * @param {string} responseName - e.g. 'GetFolderResponse', 'SyncFolderItemsResponse'
	 * @returns {Array} Array of response message objects
	 */
	getResponseMessages(parsed, responseName) {
		return getResponseMessage(parsed, responseName);
	},

	/**
	 * Helper: Get the Body element from a parsed EWS response envelope.
	 */
	getBody(parsed) {
		return parsed?.Envelope?.Body;
	},

	async sendMessageUsingEWS({ fromEmailAddress, password, subject, toEmailAddress, body } = {}) {
		common.log(`Send message using ews: ${subject}`);

		exchangeService.Credentials = new ewsClient.WebCredentials(fromEmailAddress, password);
		const message = new ewsClient.EmailMessage(exchangeService);
		message.Subject = subject;
		message.Body = new ewsClient.MessageBody(ewsClient.BodyType.Text, body);
		toEmailAddress = [].concat(toEmailAddress);

		for (let i = 0; i < toEmailAddress.length; i++) {
			message.ToRecipients.Add(new ewsClient.EmailAddress('', toEmailAddress[i]));
		}

		await message.SendAndSaveCopy(ewsClient.WellKnownFolderName.SentItems);
		common.log(message.Subject, message.Body, message.ToRecipients);
		common.log(ewsClient.WellKnownFolderName.SentItems);
		messageSentStatus = true;

		return messageSentStatus;
	}
};

export default ews;