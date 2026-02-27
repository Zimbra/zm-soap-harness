import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Calendar > ICS Format', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token, appt01Subject, appt01Id;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);

		appt01Subject = 'Appointment01' + common.getUniqueString();
		const createAppt = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appt01Subject}">
						<s d="20061120T100000Z"/>
						<e d="20061120T120000Z"/>
						<or a="${account1Email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Appointment01 Content</content>
					</mp>
					<su>${appt01Subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);
		assert.notExists(createAppt.Fault, 'Response should not be a Fault');
		appt01Id = createAppt.CreateAppointmentResponse.apptId
			|| createAppt.CreateAppointmentResponse.$.apptId;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Using the REST servlet, get a calendar using ics format 1', async () => {
		const restRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: appt01Id,
			fmt: 'ics'
		});
		assert.equal(restRes.status, 200, 'REST should return 200');
		assert.include(restRes.body, appt01Subject, 'ICS should contain SUMMARY');
	});


	it('Sanity | Using the REST servlet, get a calendar using ics format 2', async () => {
		const restRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(restRes.status, 200, 'REST should return 200');
		assert.include(restRes.body, appt01Subject, 'ICS should contain SUMMARY');
	});


	it('Sanity | Using the REST servlet, get a calendar using ics format 3', async () => {
		const restRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(restRes.status, 200, 'REST should return 200');
		assert.include(restRes.body, appt01Subject, 'ICS should contain SUMMARY');
	});


	it('Sanity | Using the REST servlet, while getting a calendar with ics format if query contains trailing spaces they should be trimmed', async () => {
		const restRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(restRes.status, 200, 'REST should return 200');
		assert.include(restRes.body, appt01Subject, 'ICS should contain SUMMARY');
	});
});
