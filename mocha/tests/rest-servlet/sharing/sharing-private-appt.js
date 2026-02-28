import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Sharing > Calendar > Private Appointment', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Create a private appointment on account1
		const subject = 'privateAppt' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="PRI" method="REQUEST" type="event" fb="B"
							transp="O" allDay="0" name="${subject}">
							<s d="20250219T120000Z"/>
							<e d="20250219T130000Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>private appointment content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		// Share calendar with view-only permission (no private)
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" inh="1" perm="r" d="${account2Email}"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify private appointment visibility in shared calendar ICS', async () => {
		const res = await rest.makeRestRequest(account2Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCALENDAR', 'Response should contain ICS data');
		// Private appointments should show as busy but not reveal details
		assert.include(res.body, 'VEVENT', 'Response should contain event');
	});


	it('Sanity | Verify owner can see private appointment details in ICS', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCALENDAR', 'Response should contain ICS data');
		assert.include(res.body, 'privateAppt', 'Owner should see private appointment');
	});
});
