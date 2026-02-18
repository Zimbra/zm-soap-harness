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

	// Backward compatibility aliases for zm-api-automation
	async searchEvent(accountAuthToken, subject) {
		return this.searchAndGetAppointment(accountAuthToken, subject);
	}

	async getAccountId(account) {
		const adminAuthToken = await this.getAdminAuthToken();
		const response = await this.getAccount(adminAuthToken, account);
		if (response && response.GetAccountResponse && response.GetAccountResponse.account && response.GetAccountResponse.account[0]) {
			return response.GetAccountResponse.account[0].id;
		}
		throw new Error(`Could not get account ID for ${account}`);
	}

	async createAlias(adminAuthToken, account, aliasEmailAddress) {
		return this.addAccountAlias(adminAuthToken, account, aliasEmailAddress);
	}
}

// Create and export singleton instance
export const soap = new SoapClient();
export default soap;
