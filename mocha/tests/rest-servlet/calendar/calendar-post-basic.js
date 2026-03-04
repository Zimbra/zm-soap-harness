import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

const dataRoot = path.join(config.projectRoot, 'mocha/data/tests');

describe('Rest Servlet > Calendar > Calendar Post Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		await main.before(this);
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
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);
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
	it('Sanity | Post a basic calendar ICS to the REST servlet', async () => {
		const icsFilePath = path.join(dataRoot, 'basic.ics');

		const postRes = await rest.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'calendar',
			fmt: 'ics',
			filePath: icsFilePath
		});

		// Verify response
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Verify the appointment appears
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="1137000000000" e="1138000000000"/>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appts = searchRes.GetApptSummariesResponse?.appt;
		const apptArr = Array.isArray(appts) ? appts : (appts ? [appts] : []);
		const found = apptArr.find(a => a.name === 'iCalBasic');

		// Verify response
		assert.exists(found, 'Appointment iCalBasic should exist');
		assert.equal(found.loc, 'iCalBasic.Location', 'Location should match');
	});


	it('Functional | Post ICS and verify full event details via search', async () => {
		const subject = 'funcAppt' + common.getUniqueString();
		const icsContent = Buffer.from(
			'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n' +
			'DTSTART:20250601T120000Z\r\nDTEND:20250601T130000Z\r\n' +
			'SUMMARY:' + subject + '\r\n' +
			'LOCATION:FuncTestLocation\r\n' +
			'END:VEVENT\r\nEND:VCALENDAR\r\n'
		);

		const postRes = await rest.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'calendar',
			fmt: 'ics',
			fileBuffer: icsContent,
			contentType: 'text/calendar'
		});

		// Verify response
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// GetApptSummariesRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="1748700000000" e="1748800000000"/>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appts = searchRes.GetApptSummariesResponse?.appt;
		const apptArr = Array.isArray(appts) ? appts : (appts ? [appts] : []);
		const found = apptArr.find(a => a.name === subject);

		// Verify response
		assert.exists(found, 'Functional appointment should exist');
	});
});

