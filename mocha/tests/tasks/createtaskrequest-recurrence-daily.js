import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > CreateTaskRequest Recurrence Daily', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create a daily recurring task', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<recur><add><rule freq="DAI"><interval ival="1"/></rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Daily recurring task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
		assert.exists(res.CreateTaskResponse.calItemId, 'Task should have calItemId');
	});


	it('Sanity | Create a daily recurring task. 5 occurrences.', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<recur><add><rule freq="DAI">
							<interval ival="1"/>
							<count num="5"/>
						</rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>5 occurrence task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | Create a daily recurring task, every 3 days', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<recur><add><rule freq="DAI">
							<interval ival="3"/>
						</rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Every 3 days task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | Create a daily recurring task, every 3 days. 4 occurrences', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<recur><add><rule freq="DAI">
							<interval ival="3"/>
							<count num="4"/>
						</rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Every 3 days, 4 occurrences</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});
});
