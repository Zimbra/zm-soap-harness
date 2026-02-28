/**
 * SoapClient - zm-api-automation SOAP client extending shared SoapClientCore
 * This file provides zm-api-automation specific configuration to the shared @zimbra/soap-client.
 * All SOAP methods are inherited from SoapClientCore.
 */

import * as soapClientPkg from '@zimbra/soap-client';
const { SoapClientCore, soapType: baseSoapType } = soapClientPkg;
import config from '../../conf/config.js';
import * as utils from '../core/utils.js';

// Disable SSL certificate verification for self-signed certificates
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Re-export soapType from shared package
export const soapType = baseSoapType;

// SoapClient class extending SoapClientCore with zm-api-automation specific configurations
class SoapClient extends SoapClientCore {
	constructor() {
		super({
			serverHost: config.serverHost,
			adminPort: config.adminPort,
			clientPort: config.clientPort,
			adminUsername: config.adminEmailAddress,
			adminPassword: config.adminPassword,
			accountPassword: config.accountPassword,
			testDomain: config.testDomain,
			testCos: config.testCos,
			frameworkPrefix: 'soap',
			accountLastName: 'SOAP Automation',
			logger: {
				loggerDebug: utils.log,
				loggerError: utils.error
			},
			config: config
		});
	}

	makeSOAPEnvelope(requestObject, authToken, account) {
		let accountNode = '';
		if (account) {
			const by = account.includes('@') ? 'name' : 'id';
			accountNode = `<account by="${by}">${account}</account>`;
		}

		const sessionNode = requestObject.includes('wait="1"') ? '<session/>' : '<nosession></nosession>';

		return (
			`<?xml version='1.0'?>
<soap:Envelope xmlns:soap='http://www.w3.org/2003/05/soap-envelope'>
<soap:Header>
	<context xmlns='urn:zimbra'>
		<authToken>${authToken}</authToken>
		<userAgent name='zmsoap'/>
		<format type='js'/>
		${sessionNode}
		${accountNode}
	</context>
</soap:Header>
<soap:Body>
	${requestObject}
</soap:Body>
</soap:Envelope>`
		);
	}

	async coreMakeSOAPEnvelope(requestObject, authToken, envelopeType, account, retryOnFault = true) {
		const maxRetries = 10;
		const delayMs = 500;
		const request = this.makeSOAPEnvelope(requestObject, authToken, account);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(envelopeType, { agent: this.httpsAgent, method: 'POST', body: request });
				const textRaw = await response.text();
				let jsonResponse;
				try {
					jsonResponse = JSON.parse(textRaw).Body;
				} catch (err) {
					if (textRaw.includes('<soap:Fault>')) {
						const codeMatch = textRaw.match(/<Code>([^<]+)<\/Code>/);
						const reasonMatch = textRaw.match(/<soap:Text>([^<]+)<\/soap:Text>/);
						jsonResponse = {
							Fault: {
								Detail: { Error: { Code: codeMatch ? codeMatch[1] : 'UNKNOWN' } },
								Reason: { Text: reasonMatch ? reasonMatch[1] : 'Unknown error' }
							}
						};
					} else {
						console.error("Non-JSON Response from server:");
						console.error(textRaw);
						throw err;
					}
				}

				// Retry on SOAP Faults when retryOnFault is enabled (server overload under concurrency)
				if (attempt >= 2) {
					await this.loggerDebug(`Retrying ${attempt}/${maxRetries}: ${requestObject}`);
				}

				if (retryOnFault && jsonResponse?.Fault && attempt < maxRetries) {
					const faultCode = jsonResponse.Fault?.Detail?.Error?.Code || '';
					const nonTransientCodes = [
						'account.AUTH_FAILED',
						'account.CHANGE_PASSWORD',
						'account.MAINTENANCE_MODE',
						'service.INVALID_REQUEST',
						'service.PERM_DENIED',
						'account.AUTH_EXPIRED',
						'account.TWO_FACTOR_AUTH_FAILED',
						'account.TWO_FACTOR_SETUP_REQUIRED',
						'mail.ALREADY_EXISTS',
						'mail.NO_SUCH_FOLDER',
						'mail.NO_SUCH_ITEM',
						'mail.CANNOT_CONTAIN',
						'service.UNKNOWN_DOCUMENT',
						'account.NO_SUCH_ACCOUNT',
						'account.PASSWORD_LOCKED',
						'account.INVALID_PASSWORD',
						'account.PASSWORD_RECENTLY_USED',
						'account.PASSWORD_CHANGE_TOO_SOON',
						'mail.QUOTA_EXCEEDED'
					];
					if (nonTransientCodes.some(code => faultCode.includes(code))) {
						return jsonResponse;
					}
					await this.sleepJs(delayMs);
					continue;
				}
				return jsonResponse;

			} catch (error) {
				if (attempt < maxRetries) {
					await this.sleepJs(delayMs);
					continue;
				}
				throw new Error(String(error));
			}
		}
	}

	async makeSOAPEnvelopeAdmin(requestObject, adminAuthToken, account = null, retryOnFault = true) {
		if (typeof account === 'boolean') {
			retryOnFault = account;
			account = null;
		}
		return this.coreMakeSOAPEnvelope(requestObject, adminAuthToken, this.adminURL, account, retryOnFault);
	}

	async makeSOAPEnvelopeAccount(requestObject, accountAuthToken, account = null, retryOnFault = true) {
		if (typeof account === 'boolean') {
			retryOnFault = account;
			account = null;
		}
		return this.coreMakeSOAPEnvelope(requestObject, accountAuthToken, this.soapURL, account, retryOnFault);
	}

	// Backward compatibility aliases for zm-api-automation
	async searchEvent(accountAuthToken, subject) {
		return this.searchAndGetAppointment(accountAuthToken, subject);
	}

	async createAlias(adminAuthToken, account, aliasEmailAddress) {
		return this.addAccountAlias(adminAuthToken, account, aliasEmailAddress);
	}
}

// Create and export singleton instance
export const soap = new SoapClient();
export default soap;
