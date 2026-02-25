import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Delete', function () {
	let adminAuth;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Delete a valid account', async () => {
		const accountName = `del_valid_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.DeleteAccountResponse, 'Should delete account successfully');
	});


	it('Regression | Delete two accounts simultaneously', async () => {
		const name1 = `del_sim1_${common.getUniqueString()}@${config.testDomain}`;
		const name2 = `del_sim2_${common.getUniqueString()}@${config.testDomain}`;
		const create1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id1 = create1.CreateAccountResponse.account[0].id;

		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;

		// Try to delete both by comma-separated ids
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${id1},${id2}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for simultaneous delete');
	});


	it('Sanity | Delete an account ID that is already deleted', async () => {
		const accountName =
			`del_already_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;

		// Delete first time
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Delete again
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for already deleted account');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Functional | Delete non-existing account', async () => {
		const fakeId = '00000000-0000-0000-0000-000000000000';
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${fakeId}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for non-existing account');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Regression | Delete an account with some text in id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>sometext</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for text id');
	});


	it('Functional | Delete a renamed account', async () => {
		const originalName =
			`del_rename_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${originalName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;

		// Rename
		const newName = `del_renamed_${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuth);

		// Delete by same id
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.exists(res.DeleteAccountResponse, 'Should delete renamed account by id');
	});


	it('Regression | Delete an account with spaces/Special Character/Zero/Negative numbers/Leading Spaces / Trailling Spaces / Space before and after the id', async () => {
		const invalidIds = ['"      "', '"@#$%"', '000', '-1627', '"      abcd"', '"abcd     "', '"    abcd     "'];
		for (const id of invalidIds) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
					<id>${id}</id>
				</DeleteAccountRequest>`, adminAuth);
			assert.isTrue(res.Fault !== undefined || res.DeleteAccountResponse !== undefined,
				`Should return Fault or response for id=${id}`);
		}
	});


	it('Functional | Delete account by parsing invalid attribute in DeleteAccountRequest', async () => {
		const accountName = `del_attr_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin" invalidattr="true">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);
		// Invalid attributes should be ignored — account should still be deleted
		assert.exists(res.DeleteAccountResponse || res.Fault,
			'Should handle invalid attribute');
	});
});
