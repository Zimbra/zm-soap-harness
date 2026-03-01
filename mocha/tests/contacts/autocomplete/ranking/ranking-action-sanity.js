import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Contacts > AutoComplete > Ranking > RankingActionRequest Sanity', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});


	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}


	// Tests
	it('Smoke | RankingActionRequest reset operation', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'RankingAction should not be a Fault');
	});


	it('Sanity | RankingActionRequest delete operation', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="nonexist${common.getUniqueString()}@domain.com"/>
			</RankingActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'RankingAction should not be a Fault');
	});


	it('Sanity | RankingActionRequest reset after activity', async () => {
		const targetEmail = `target${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${targetEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${targetEmail}"/>
					<su>test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'RankingAction should not be a Fault');
	});
});
