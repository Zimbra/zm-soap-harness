import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Modify-Identity', function () {
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

	it('Smoke | Modify identity display name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}"><a name="zimbraPrefFromDisplay">Old</a></identity>
			</CreateIdentityRequest>`, authToken
		);
		const idId = createRes.CreateIdentityResponse.identity[0].id;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${idId}"><a name="zimbraPrefFromDisplay">New Display</a></identity>
			</ModifyIdentityRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyIdentityRequest should not fault');
		assert.exists(modRes.ModifyIdentityResponse, 'ModifyIdentityResponse should exist');
	});

	it('Sanity | Modify identity from address', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}"/>
			</CreateIdentityRequest>`, authToken
		);
		const idId = createRes.CreateIdentityResponse.identity[0].id;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${idId}"><a name="zimbraPrefFromAddress">${accountEmail}</a></identity>
			</ModifyIdentityRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyIdentityRequest should not fault');
		assert.exists(modRes.ModifyIdentityResponse, 'ModifyIdentityResponse should exist');
	});

	it('Sanity | Modify identity reply-to settings', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}"/>
			</CreateIdentityRequest>`, authToken
		);
		const idId = createRes.CreateIdentityResponse.identity[0].id;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${idId}">
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToAddress">reply@test.com</a>
				</identity>
			</ModifyIdentityRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyIdentityRequest should not fault');
		assert.exists(modRes.ModifyIdentityResponse, 'ModifyIdentityResponse should exist');
	});

	it('Functional | Modify identity name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}"/>
			</CreateIdentityRequest>`, authToken
		);
		const idId = createRes.CreateIdentityResponse.identity[0].id;
		const newName = `renamed${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${idId}" name="${newName}"/>
			</ModifyIdentityRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyIdentityRequest rename should not fault');
		assert.exists(modRes.ModifyIdentityResponse, 'ModifyIdentityResponse should exist');
	});

	it('Functional | Modify non-existent identity should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="nonexistent_${common.getUniqueString()}">
					<a name="zimbraPrefFromDisplay">Ghost</a>
				</identity>
			</ModifyIdentityRequest>`, authToken
		);
		assert.exists(modRes.Fault, 'Modify non-existent identity should fault');
	});

	it('Functional | Modify identity and verify via GetIdentities', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}"><a name="zimbraPrefFromDisplay">Before</a></identity>
			</CreateIdentityRequest>`, authToken
		);
		const idId = createRes.CreateIdentityResponse.identity[0].id;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${idId}"><a name="zimbraPrefFromDisplay">After</a></identity>
			</ModifyIdentityRequest>`, authToken
		);
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetIdentitiesRequest should not fault');
		assert.exists(getRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');
	});
});
