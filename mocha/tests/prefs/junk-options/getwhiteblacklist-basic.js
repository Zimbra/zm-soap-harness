import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Junk Options > Getwhiteblacklist Basic', function () {
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
	it('Smoke | Verify GetWhiteBlackListRequest set to domain blacklist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add domain to blacklist
		const blackDomain = `blackdomain${common.getUniqueString()}.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackDomain}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse, 'GetWhiteBlackListResponse should exist');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should exist');
	});


	it('Sanity | Verify GetWhiteBlackListRequest set to user blacklist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add user to blacklist
		const blackUser = `blackuser.${common.getUniqueString()}@example.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackUser}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should exist');
	});


	it('Sanity | Verify GetWhiteBlackListRequest set to user + domain blacklist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add both user and domain to blacklist
		const blackUser = `blackuser.${common.getUniqueString()}@example.com`;
		const blackDomain = `blackdomain${common.getUniqueString()}.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackUser}</addr>
					<addr op="+">${blackDomain}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should exist');
	});


	it('Sanity | Verify GetWhiteBlackListRequest set to domain whitelist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add domain to whitelist
		const whiteDomain = `whitedomain${common.getUniqueString()}.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteDomain}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.whiteList, 'whiteList should exist');
	});


	it('Sanity | Verify GetWhiteBlackListRequest set to user whitelist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add user to whitelist
		const whiteUser = `whiteuser.${common.getUniqueString()}@example.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteUser}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.whiteList, 'whiteList should exist');
	});


	it('Sanity | Verify GetWhiteBlackListRequest set to user + domain whitelist and blacklist is obeyed', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add to both whitelist and blacklist
		const whiteUser = `white.${common.getUniqueString()}@example.com`;
		const whiteDomain = `whitedomain${common.getUniqueString()}.com`;
		const blackUser = `black.${common.getUniqueString()}@example.com`;
		const blackDomain = `blackdomain${common.getUniqueString()}.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteUser}</addr>
					<addr op="+">${whiteDomain}</addr>
				</whiteList>
				<blackList>
					<addr op="+">${blackUser}</addr>
					<addr op="+">${blackDomain}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Get and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.whiteList, 'whiteList should exist');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should exist');
	});


	it('Sanity | Verify remove all records from whitelist and blacklist', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add records
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">white1.${common.getUniqueString()}@example.com</addr>
					<addr op="+">white2.${common.getUniqueString()}@example.com</addr>
				</whiteList>
				<blackList>
					<addr op="+">black1.${common.getUniqueString()}@example.com</addr>
					<addr op="+">black2.${common.getUniqueString()}@example.com</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Remove all records (empty lists)
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList/>
				<blackList/>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
		assert.exists(modRes.ModifyWhiteBlackListResponse, 'ModifyWhiteBlackListResponse should exist');
	});


	it('Sanity | Verify remove all records only from whitelist', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add records
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">white1.${common.getUniqueString()}@example.com</addr>
				</whiteList>
				<blackList>
					<addr op="+">black1.${common.getUniqueString()}@example.com</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Remove only whitelist
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList/>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Verify blacklist still has records
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should still exist');
	});


	it('Sanity | Verify remove all records only from blacklist', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add records
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">white1.${common.getUniqueString()}@example.com</addr>
				</whiteList>
				<blackList>
					<addr op="+">black1.${common.getUniqueString()}@example.com</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Remove only blacklist
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList/>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Verify whitelist still has records
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.whiteList, 'whiteList should still exist');
	});


	it('Sanity | Add and remove whitelist and blacklist in same request', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add initial records
		const blackAddr = `black.${common.getUniqueString()}@example.com`;
		const whiteAddr = `white.${common.getUniqueString()}@example.com`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteAddr}</addr>
				</whiteList>
				<blackList>
					<addr op="+">${blackAddr}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Add new record + remove existing in same request
		const newWhiteAddr = `newwhite.${common.getUniqueString()}@example.com`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${newWhiteAddr}</addr>
				</whiteList>
				<blackList>
					<addr op="-">${blackAddr}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault');

		// Verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse, 'GetWhiteBlackListResponse should exist');
	});


	it('Sanity | Verify add duplicate records to whitelist', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add record
		const whiteAddr = `white.${common.getUniqueString()}@example.com`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteAddr}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Add duplicate record
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteAddr}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyWhiteBlackListRequest should not fault for duplicate');
	});
});
