import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > AutoComplete > Ranking > RankingActionRequest Delete', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
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
	it('Smoke | Delete ranking entry', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Send ranking action request
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${account2Email}"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Delete should not be a Fault');
	});


	it('Sanity | Delete ranking and verify autocomplete changes', async () => {
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${account2Email}"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Delete should not be a Fault');

		// Send auto complete request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | Delete non-existing ranking entry', async () => {
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="nonexistent${common.getUniqueString()}@nonexist.com"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Delete should not be a Fault');
	});


	it('Sanity | Delete ranking with multiple entries', async () => {
		const account3Email = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<su>test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Send ranking action request
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${account3Email}"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Delete should not be a Fault');
	});


	it('Sanity | Delete all and verify empty rankings', async () => {
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Reset should not be a Fault');
	});


	it('Sanity | Delete ranking entry then send again', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>resend ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Send auto complete request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});
});
