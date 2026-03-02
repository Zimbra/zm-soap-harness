import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > Createtaskrequest Recurrence Allday', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Create a daily recurring appointment - All Day', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" allDay="1">
						<or a="${accountEmail}"/>
						<s d="20240301"/>
						<recur><add><rule freq="DAI"><interval ival="1"/></rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>All day recurring task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | Create a daily recurring appointment - All Day. 5 occurrences.', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" allDay="1">
						<or a="${accountEmail}"/>
						<s d="20240301"/>
						<recur><add><rule freq="DAI">
							<interval ival="1"/>
							<count num="5"/>
						</rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>All day 5 occurrences</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | Verify bug 26284', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" allDay="1">
						<or a="${accountEmail}"/>
						<s d="20240301"/>
						<e d="20240302"/>
						<recur><add><rule freq="DAI"><interval ival="1"/>
							<count num="3"/></rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Bug 26284 test</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');

		// Verify task can be retrieved
		const taskId = res.CreateTaskResponse.invId;

		// GetTaskRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${taskId}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetTask should not be a Fault');
		assert.exists(getRes.GetTaskResponse, 'GetTaskResponse should exist');
	});
});
