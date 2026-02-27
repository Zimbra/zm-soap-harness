import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Fmt > Sync > Appointment', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify sync format for appointment returns X-Zimbra headers', async () => {
		const subject = 'syncAppt' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="20250201T120000Z"/>
							<e d="20250201T130000Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>sync appt content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		// Get calendar in sync format
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'sync'
		});
		assert.oneOf(res.status, [200, 204], 'REST GET should return 200 or 204');
	});


	it('Sanity | Verify sync format for calendar returns appointment data', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VCALENDAR', 'Should contain calendar data');
	});


	it('Functional | Verify sync format for appointment with time range', async () => {
		const subject = 'syncApptRange' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="20250301T140000Z"/>
							<e d="20250301T150000Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>sync range content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});
});
