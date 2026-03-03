import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Calendar > Search Content', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const apptSubject = `appt_${common.getUniqueString()}`;
	const apptLocation = `loc_${common.getUniqueString()}`;
	const apptContent = `content_${common.getUniqueString()}`;

	// Generate iCal times
	const now = new Date();
	const startTime = new Date(now.getTime() + 3600000); // +1 hour
	const endTime = new Date(now.getTime() + 7200000); // +2 hours
	const pad = (n) => String(n).padStart(2, '0');
	const icalStart = `${startTime.getFullYear()}${pad(startTime.getMonth() + 1)}${pad(startTime.getDate())}T${pad(startTime.getHours())}${pad(startTime.getMinutes())}00`;
	const icalEnd = `${endTime.getFullYear()}${pad(endTime.getMonth() + 1)}${pad(endTime.getDate())}T${pad(endTime.getHours())}${pad(endTime.getMinutes())}00`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Functional | Login as the appropriate test account', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create an appointment
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" allday="0" name="${apptSubject}" loc="${apptLocation}">
						<s d="${icalStart}"/>
						<e d="${icalEnd}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Search for an appointment based on subject (Bug: 3141, 5176)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:"${apptSubject}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Search for an appointment based on location (Bug: 3141, 5176)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>"${apptLocation}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Search for an appointment based on content (Bug: 3141, 5176)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>"${apptContent}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Search for an appointment based on date (Bug: 2753, 5176)', async () => {
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const year = now.getFullYear();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>after:${month}/${day}/${year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
