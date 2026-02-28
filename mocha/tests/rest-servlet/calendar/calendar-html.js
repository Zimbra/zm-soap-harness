import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Calendar > HTML Format', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token, appt01Id, appt02Id;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);

		const appt01Subject = 'Appointment01' + common.getUniqueString();
		const appt01Content = 'Content01' + common.getUniqueString();

		// CreateAppointmentRequest
		const createAppt01 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appt01Subject}">
						<s d="20260301T100000Z"/>
						<e d="20260301T120000Z"/>
						<or a="${account1Email}"/>
					</inv>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>${appt01Content}</content>
						</mp>
						<mp ct="text/html">
							<content>&lt;html&gt;&lt;body&gt;${appt01Content}&lt;/body&gt;&lt;/html&gt;</content>
						</mp>
					</mp>
					<su>${appt01Subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createAppt01.Fault, 'Response should not be a Fault');
		appt01Id = createAppt01.CreateAppointmentResponse.apptId
			|| createAppt01.CreateAppointmentResponse.$.apptId;

		const appt02Subject = 'Appointment02' + common.getUniqueString();
		const appt02Content = 'Content02' + common.getUniqueString();

		// CreateAppointmentRequest
		const createAppt02 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appt02Subject}">
						<s d="20260301T100000Z"/>
						<e d="20260301T120000Z"/>
						<or a="${account1Email}"/>
					</inv>
					<mp ct="text/plain">
						<content>${appt02Content}</content>
					</mp>
					<su>${appt02Subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createAppt02.Fault, 'Response should not be a Fault');
		appt02Id = createAppt02.CreateAppointmentResponse.apptId
			|| createAppt02.CreateAppointmentResponse.$.apptId;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Using the REST servlet, get a calendar using html format 1', async () => {
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: appt01Id,
			fmt: 'html'
		});

		// Verify response
		assert.equal(restRes.status, 200, 'REST should return 200');
	});


	it('Sanity | Using the REST servlet, get a calendar using html format 2', async () => {
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'html'
		});

		// Verify response
		assert.equal(restRes.status, 200, 'REST should return 200');
	});


	it('Sanity | Using the REST servlet, get a calendar using html format 3', async () => {
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'html'
		});

		// Verify response
		assert.equal(restRes.status, 200, 'REST should return 200');
	});


	it('Sanity | Using the REST servlet, get an appointment with only text, plain parts using html format', async () => {
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: appt02Id,
			fmt: 'html'
		});

		// Verify response
		assert.equal(restRes.status, 200, 'REST should return 200');
	});
});
