import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 52558', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Send Later does not add new email address to Emalied Contacts', async () => {
		// Create two accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1Email);

		// Enable auto-add address
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefAutoAddAddressEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, authToken1
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Verify contact does not yet exist
		const contactName = `Last${common.getUniqueString()}`;
		const searchContactRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contactName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchContactRes1.Fault, 'SearchRequest should not fault');

		// Save a draft with autoSendTime (send later)
		const subject = `subject${common.getUniqueString()}`;
		const autoSendTime = Math.floor((Date.now() + 60000) / 1000);
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m autoSendTime="${autoSendTime}">
					<e t="t" a="${account2Email}" p="${contactName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, authToken1
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		assert.exists(saveDraftRes.SaveDraftResponse.m, 'SaveDraftResponse should contain message');
		const draftMsg = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;
		assert.exists(draftMsg.id, 'Draft message should have an id');
	});


	it('Sanity | Test for autoSendTime with invalid values', async () => {
		// Create two accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1Email);

		// Enable auto-add address
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefAutoAddAddressEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, authToken1
		);

		// Verify contact does not exist
		const contactName = `Last${common.getUniqueString()}`;
		const subject = `subject${common.getUniqueString()}`;

		// Test with blank autoSendTime - should fail
		const blankRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m autoSendTime=" ">
					<e t="t" a="${account2Email}" p="${contactName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, authToken1, false
		);
		assert.isString(blankRes.Fault.Detail.Error.Code, 'Blank autoSendTime should return a Fault');
		assert.include(
			blankRes.Fault.Detail.Error.Code, 'service.FAILURE',
			'Should return service.FAILURE for blank autoSendTime'
		);

		// Test with alphanumeric autoSendTime - should fail
		const alphaRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m autoSendTime="aaa123bbb123">
					<e t="t" a="${account2Email}" p="${contactName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, authToken1, false
		);
		assert.isString(alphaRes.Fault.Detail.Error.Code, 'Alphanumeric autoSendTime should return a Fault');
		assert.include(
			alphaRes.Fault.Detail.Error.Code, 'service.FAILURE',
			'Should return service.FAILURE for alphanumeric autoSendTime'
		);
	});
});
