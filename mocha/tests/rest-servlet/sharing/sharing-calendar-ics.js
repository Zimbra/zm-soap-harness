import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Sharing > Calendar > ICS Format', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Create appointment on account1
		const subject = 'sharedAppt' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="20250119T120000Z"/>
							<e d="20250119T130000Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>shared calendar test</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		// Share calendar with account2
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
	it('Sanity | Download shared calendar in ICS format via REST', async () => {
		const res = await soap.makeRestRequest(account2Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCALENDAR', 'Response should contain ICS data');
		assert.include(res.body, 'BEGIN:VEVENT', 'Response should contain calendar event');
	});


	it('Sanity | Verify ICS format contains appointment details', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'BEGIN:VCALENDAR', 'Response should start with VCALENDAR');
		assert.include(res.body, 'VEVENT', 'Response should contain event');
	});


	it('Sanity | Verify ICS format calendar export has correct structure', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'PRODID:', 'ICS should contain PRODID');
		assert.include(res.body, 'VERSION:2.0', 'ICS should contain VERSION');
	});
});
