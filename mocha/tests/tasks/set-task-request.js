import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > SetTaskRequest', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Use SetTaskRequest to create a simple task', async () => {
		const subject = `task${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// SetTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SetTaskRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv uid="${uid}" type="task">
							<comp name="${subject}" status="NEED" priority="5" percentComplete="0">
								<or a="${accountEmail}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain"><content>Set task content</content></mp>
					</m>
				</default>
			</SetTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SetTaskResponse, 'SetTaskResponse should exist');
		assert.exists(res.SetTaskResponse.calItemId, 'Should have calItemId');
	});
});
