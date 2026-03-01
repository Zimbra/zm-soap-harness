import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('iCal > Create Appointment Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Smoke | Verify the basic iCal format when CreateAppointmentRequest is used to inject the iCal', async () => {
		const account1Email = `ical1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account1Email, account1Email
		);
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email, config.accountPassword
		);

		const account2Email = `ical2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account2Email, account2Email
		);

		const apptSubject = `appt1.${common.getUniqueString()}`;
		const apptLocation = `loc1.${common.getUniqueString()}`;
		const apptContent = `content1.${common.getUniqueString()}`;

		// Create appointment with ICAL time format
		const now = new Date();
		const start = new Date(now.getTime() + 3600000);
		const end = new Date(now.getTime() + 7200000);
		const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const startStr = fmt(start);
		const endStr = fmt(end);

		// CreateAppointmentRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${apptSubject}" loc="${apptLocation}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${startStr}"/>
						<e d="${endStr}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAppointmentRequest should not fault');
		assert.exists(res.CreateAppointmentResponse,
			'CreateAppointmentResponse should exist');

		// Get iCal
		const searchStart = now.getTime() - 2 * 86400000;
		const searchEnd = now.getTime() + 2 * 86400000;

		// GetICalRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetICalRequest xmlns="urn:zimbraMail"
				s="${searchStart}" e="${searchEnd}"/>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetICalRequest should not fault');
		assert.exists(res.GetICalResponse, 'GetICalResponse should have content');
		assert.exists(res.GetICalResponse, 'GetICalResponse should exist');
	});


	it('Functional | Verify that only one timezone is specified when using tz Hawaii', async () => {
		const account3Email = `ical3.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account3Email, account3Email
		);
		const account3AuthToken = await soap.getAccountAuthToken(
			account3Email, config.accountPassword
		);

		const account4Email = `ical4.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account4Email, account4Email
		);

		const apptSubject = `appt2.${common.getUniqueString()}`;
		const apptLocation = `loc2.${common.getUniqueString()}`;
		const apptContent = `content2.${common.getUniqueString()}`;

		const now = new Date();
		const start = new Date(now.getTime() + 14400000);
		const end = new Date(now.getTime() + 18000000);
		const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const startStr = fmt(start);
		const endStr = fmt(end);

		// CreateAppointmentRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${apptSubject}" loc="${apptLocation}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account4Email}"/>
						<s d="${startStr}" tz="(GMT-10.00) Hawaii"/>
						<e d="${endStr}" tz="(GMT-10.00) Hawaii"/>
						<or a="${account3Email}"/>
					</inv>
					<e a="${account4Email}" t="t"/>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAppointmentRequest should not fault');
		const invId = res.CreateAppointmentResponse?.invId;

		// Verify response
		assert.exists(invId, 'invId should exist');

		// Get iCal by invId
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetICalRequest xmlns="urn:zimbraMail"
				id="${invId}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetICalRequest should not fault');
		assert.exists(res.GetICalResponse, 'GetICalResponse should have content');
		assert.exists(res.GetICalResponse, 'GetICalResponse should exist');
	});
});
