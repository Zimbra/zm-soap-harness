import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > Cancel Tasks', function () {
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
	it('Sanity | To Cancel a task', async () => {
		const subject = `task${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task to cancel</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const taskId = createRes.CreateTaskResponse.invId;

		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain"><content>Task cancelled</content></mp>
				</m>
			</CancelTaskRequest>`, accountAuthToken
		);
		assert.notExists(cancelRes.Fault, 'Response should not be a Fault');
		assert.exists(cancelRes.CancelTaskResponse,
			'CancelTaskResponse should exist');
	});


	it('Sanity | Verify that canceling an already canceled task gives No Such Item', async () => {
		const subject = `task${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task to double cancel</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const taskId = createRes.CreateTaskResponse.invId;

		// Cancel first time
		const cancelRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CancelTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain"><content>Cancelled</content></mp>
				</m>
			</CancelTaskRequest>`, accountAuthToken
		);
		assert.notExists(cancelRes1.Fault, 'First cancel should not be a Fault');

		// Cancel second time - should fault
		const cancelRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CancelTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<su>Cancelled again: ${subject}</su>
					<mp ct="text/plain"><content>Cancelled again</content></mp>
				</m>
			</CancelTaskRequest>`, accountAuthToken
		);
		assert.exists(cancelRes2.Fault, 'Second cancel should be a Fault');
	});
});
