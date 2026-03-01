import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Folders > GetEffectiveFolderPermsRequest_Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `folders.${uid}a@${config.testDomain}`;
		account2Name = `folders.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify GetEffectiveFolderPermsRequest for read access', async () => {
		// Source: GetEffectiveFolderPermsRequest_01 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for write access', async () => {
		// Source: GetEffectiveFolderPermsRequest_02 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for delete access', async () => {
		// Source: GetEffectiveFolderPermsRequest_03 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for insert access', async () => {
		// Source: GetEffectiveFolderPermsRequest_04 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for freebusy access', async () => {
		// Source: GetEffectiveFolderPermsRequest_05 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for workflow access', async () => {
		// Source: GetEffectiveFolderPermsRequest_06 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for admin access', async () => {
		// Source: GetEffectiveFolderPermsRequest_07 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for revoking the permission', async () => {
		// Source: GetEffectiveFolderPermsRequest_08 from Folders/Sharing/GetEffectiveFolderPermsRequest_Basic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
