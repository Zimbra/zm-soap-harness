import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Virtualhost > Virtualhost Getinforequest', function () {
	let virtHostAccount;
	let virtAuth;
	let virtDomain;

	before(async function () {
		const adminAuth = await soap.getAdminAuthToken();

		const unique = common.getUniqueString();
		const domainName = `domain.${unique}.${config.testDomain}`;
		const virtHostname = `virtual.${domainName}`;

		const createDomainRequest =
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraVirtualHostname">${virtHostname}</a>
				<a n="zimbraPublicServiceHostname">${virtHostname}</a>
			</CreateDomainRequest>`;
		await soap.makeSOAPEnvelopeAdmin(createDomainRequest, adminAuth);

		virtHostAccount = `vh_user_info_${unique}@${domainName}`;
		await soap.createAccountByNameAndEmailAddress(adminAuth, virtHostAccount, virtHostAccount);

		// Login with Virtual Host
		const authRequest =
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${virtHostAccount}</account>
				<password>${config.accountPassword}</password>
				<virtualHost>${virtHostname}</virtualHost>
			</AuthRequest>`;
		const authResp = await soap.makeSOAPEnvelopeAccount(authRequest, null);

		virtAuth = authResp.AuthResponse.authToken[0]._content;

		virtDomain = virtHostname;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (virtHostAccount) await soap.deleteAccount(virtHostAccount, adminAuth);
		// Best effort domain cleanup - can be tricky if we lost the ID or original name
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify the URL for GetInfoRequest uses the virtual host name', async () => {
		const getInfoRequest = '<GetInfoRequest xmlns="urn:zimbraAccount"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getInfoRequest, virtAuth);
		assert.notExists(resp.Fault, 'Response should not be a Fault');
		assert.exists(resp.GetInfoResponse, 'Should return info');
		assert.include(resp.GetInfoResponse.rest, virtDomain,
			'REST URL should contain virtual hostname');
		assert.include(resp.GetInfoResponse.soapURL, virtDomain,
			'SOAP URL should contain virtual hostname');
	});

});
