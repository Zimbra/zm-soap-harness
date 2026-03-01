import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Delete-Identity', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Smoke | Delete identity by name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);
		assert.notExists(delRes.Fault, 'DeleteIdentityRequest should not fault');
		assert.exists(delRes.DeleteIdentityResponse, 'DeleteIdentityResponse should exist');
	});


	it('Sanity | Delete identity by ID', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		const identityId = createRes.CreateIdentityResponse.identity[0].id;

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${identityId}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);
		assert.notExists(delRes.Fault, 'DeleteIdentityRequest by ID should not fault');
		assert.exists(delRes.DeleteIdentityResponse, 'DeleteIdentityResponse should exist');
	});


	it('Sanity | Delete non-existent identity should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="nonexistent_${common.getUniqueString()}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);
		assert.exists(delRes.Fault, 'Delete non-existent identity should fault');
	});


	it('Functional | Delete identity and verify via GetIdentities', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetIdentitiesRequest should not fault');
		assert.exists(getRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');
	});


	it('Functional | Delete DEFAULT identity should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="DEFAULT"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);
		assert.exists(delRes.Fault, 'Delete DEFAULT identity should fault');
	});
});
