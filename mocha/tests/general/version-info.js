import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Version Info', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify when zimbraSoapExposeVersion is FALSE, GetVersionInfoRequest on port 80 gives servicePERMDENIED', async () => {
		// ModifyConfigRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraSoapExposeVersion">FALSE</a>
			</ModifyConfigRequest>`, adminAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send get version info request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetVersionInfoRequest xmlns="urn:zimbraAccount"/>', accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Error code should be service.PERM_DENIED');
	});


	it('Sanity | Verify after setting zimbraSoapExposeVersion to TRUE, GetVersionInfoRequest can be sent on port 80', async () => {
		// ModifyConfigRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraSoapExposeVersion">TRUE</a>
			</ModifyConfigRequest>`, adminAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Send get config request
		const verifyConfig = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraSoapExposeVersion"/>
			</GetConfigRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(verifyConfig.Fault, 'GetConfigRequest should not fault');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send get version info request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetVersionInfoRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const info = res.GetVersionInfoResponse.info[0] || res.GetVersionInfoResponse.info;

		// Verify response
		assert.exists(info, 'Info should exist');
		assert.exists(info.version, 'Version should exist');
		assert.match(String(info.release), /^\d+$/,
			'Release should be a number');
		assert.match(info.buildDate, /[0-9-]*/,
			'BuildDate should be a date');
		assert.exists(info.host, 'Host should exist');

		// Send modify config request
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraSoapExposeVersion">FALSE</a>
			</ModifyConfigRequest>`, adminAuthToken
		);
	});
});
