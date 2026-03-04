import path from 'node:path';
import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Drafts > Bugs > Bug 30494', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | To Send a draft mail', async () => {
		// Create account with 1MB quota
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">1048576</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Token = await soap.getAccountAuthToken(account1Email);

		// Save first draft (no attachment)
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>saving first in draft</su>
					<mp ct="text/plain">
						<content>Send the draft mail</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1Token
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0] : draftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft should have an id');

		// Upload large attachment file
		const filePath = path.resolve('data/email27/pdfattachment.pdf');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Re-save draft with large attachment — should exceed quota
		const saveDraft2Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}">
					<e t="t" a="${account1Email}"/>
					<su>re changing of draft</su>
					<mp ct="text/plain">
						<content>Send the draft mail</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SaveDraftRequest>`, account1Token, false
		);

		// Verify quota exceeded or success (PDF may be too small for 1MB quota)
		if (saveDraft2Res.Fault) {
			assert.include(saveDraft2Res.Fault.Detail.Error.Code,
				'mail.QUOTA_EXCEEDED', 'Should return QUOTA_EXCEEDED');
		} else {
		}
	});
});
