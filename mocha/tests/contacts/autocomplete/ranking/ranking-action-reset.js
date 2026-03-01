import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Contacts > AutoComplete > Ranking > RankingActionRequest Reset', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email;

	before(async function () {
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


	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}


	// Tests
	it('Smoke | Reset ranking and verify autocomplete', async () => {
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
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Reset should not be a Fault');
	});


	it('Sanity | Reset ranking after multiple sends', async () => {
		for (let i = 0; i < 3; i++) {

			// Send the message
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${account2Email}"/>
						<su>bulk ${common.getUniqueString()}</su>
						<mp ct="text/plain">
							<content>content</content>
						</mp>
					</m>
				</SendMsgRequest>`, account1Token
			);
		}

		// Send ranking action request
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Reset should not be a Fault');
	});


	it('Sanity | Verify autocomplete after reset', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, account1Token
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | Reset ranking with no prior data', async () => {
		const account3Email = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const account3Token = await soap.getAccountAuthToken(account3Email);

		// Send ranking action request
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account3Token
		);

		// Verify response
		assert.notExists(resetRes.Fault, 'Reset should not be a Fault');
	});
});
