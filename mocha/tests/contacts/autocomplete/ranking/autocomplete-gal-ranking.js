import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > Autocomplete > Ranking > Autocomplete GAL Ranking', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account3Email;

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

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
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
	it('Smoke | AutoComplete GAL ranking initial state', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Sanity | GAL ranking after sending to account', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>gal ranking ${common.getUniqueString()}</su>
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
	});


	it('Sanity | GAL ranking with multiple recipients', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<su>gal rank multi ${common.getUniqueString()}</su>
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
	});


	it('Sanity | GAL ranking order verification', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Sanity | GAL ranking after reset', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);

		// Send auto complete request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});
});
