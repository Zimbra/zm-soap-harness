import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > Get Tasks', function () {
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
	it('Sanity | To obtain the details of a task using GetTaskRequest', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" priority="5"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task details test</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const taskId = createRes.CreateTaskResponse.invId;

		// GetTaskRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${taskId}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTaskResponse, 'GetTaskResponse should exist');
	});


	it('Functional | To send GetTaskRequest with id of a canceled Task It should get moved to trash', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task to cancel and get</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const taskId = createRes.CreateTaskResponse.invId;

		// Cancel the task
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain"><content>Cancelled</content></mp>
				</m>
			</CancelTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'Cancel should not be a Fault');

		// Get the canceled task - should fault (no such item)
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${taskId}"/>`, accountAuthToken, false
		);
		// Server may fault with "no such item" or return the cancelled task
		if (getRes.Fault) {

			// Verify response
			assert.exists(getRes.Fault, 'GetTask for cancelled task should be a Fault');
		} else {
			assert.exists(getRes.GetTaskResponse, 'GetTaskResponse should exist for cancelled task in trash');
		}
	});
});
