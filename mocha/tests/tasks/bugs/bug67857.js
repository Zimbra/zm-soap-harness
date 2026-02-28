import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Tasks > Bugs > Bug67857', function () {
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
	it('Sanity | Verify no NPE in CreateTaskResponse for SOAP CreateTaskRequest with no recipient', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>No recipient task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
		assert.exists(res.CreateTaskResponse.calItemId, 'Should have calItemId');
	});


	it('Sanity | Verify no NPE in CreateAppointmentResponse for SOAP CreateAppointmentRequest with no recipient', async () => {
		const subject = `appt${common.getUniqueString()}`;

		// CreateAppointmentRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<e d="20240301T100000"/>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>No recipient appointment</content></mp>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateAppointmentResponse,
			'CreateAppointmentResponse should exist');
		assert.exists(res.CreateAppointmentResponse.calItemId,
			'Should have calItemId');
	});
});
