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
	it('Smoke | Delete a valid account', async () => {
		const accountName = `del_valid_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// DeleteAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | Delete two accounts simultaneously (cannt delete simultaneously two accounts)', async () => {
		const name1 = `del_sim1_${common.getUniqueString()}@${config.testDomain}`;
		const name2 = `del_sim2_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const create1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id1 = create1.CreateAccountResponse.account[0].id;
		const host = create1.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Create account
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;
		const host2 = create2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Try to delete both by comma-separated ids
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${id1},${id2}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for simultaneous delete');
	});


	it('Sanity | Delete an account ID that is already deleted', async () => {
		const accountName =
			`del_already_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

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

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for already deleted account');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Functional | Delete non-existing account', async () => {
		const fakeId = '00000000-0000-0000-0000-000000000000';

		// DeleteAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${fakeId}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for non-existing account');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Regression | Delete an account with some text in id', async () => {
		// DeleteAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>sometext</id>
			</DeleteAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for text id');
	});


	it('Functional | Delete a renamed account', async () => {
		const originalName =
			`del_rename_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${originalName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Rename
		const newName = `del_renamed_${common.getUniqueString()}@${config.testDomain}`;

		// RenameAccountRequest
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

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | Delete an account with spaces, Special Character, Zero, Negative numbers, Leading Spaces , Trailling Spaces , Space before and after the id', async () => {
		const invalidIds = ['"      "', '"@#$%"', '000', '-1627', '"      abcd"', '"abcd     "', '"    abcd     "'];
		for (const id of invalidIds) {

			// DeleteAccountRequest
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
					<id>${id}</id>
				</DeleteAccountRequest>`, adminAuth);

			// Verify response
			assert.isString(res.Fault.Detail.Error.Code,
				`Should return Fault for id=${id}`);
		}
	});


	it('Functional | Delete account by parsing invalid attribute in DeleteAccountRequest', async () => {
		const accountName = `del_attr_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// DeleteAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin" invalidattr="true">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuth);
		// Invalid attributes should be ignored — account should still be deleted
		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
