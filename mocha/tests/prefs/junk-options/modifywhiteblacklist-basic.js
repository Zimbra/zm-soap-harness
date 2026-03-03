import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Junk Options > Modifywhiteblacklist Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Verify ModifyWhiteBlackListRequest blacklist domain blocks messages', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const blackDomain = `@blackdomain${common.getUniqueString()}.com`;

		// Modify white/black list
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackDomain}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});


	it('Sanity | Verify ModifyWhiteBlackListRequest blacklist user blocks messages', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const blackUser = `blackuser.${common.getUniqueString()}@example.com`;

		// Modify white/black list
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackUser}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});


	it('Sanity | Verify ModifyWhiteBlackListRequest whitelist domain allows messages', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const whiteDomain = `whitedomain${common.getUniqueString()}.com`;

		// Modify white/black list
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteDomain}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});


	it('Sanity | Verify ModifyWhiteBlackListRequest whitelist user allows messages', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const whiteUser = `whiteuser.${common.getUniqueString()}@example.com`;

		// Modify white/black list
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteUser}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});
});
