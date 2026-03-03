import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Purge Calendar > Purge Account Calendar Cache', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountEmail;
	let accountId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		accountEmail = `test1.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		accountId = account.id;
		assert.exists(accountId, 'Account id should exist');
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
	it('Functional | Purge a Account Calendar and verify that cache file got deleted', async () => {
		// Get mailbox ID for the account
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
		assert.exists(mbox.mbxid, 'Mailbox ID should exist');

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create a calendar appointment
		const apptSubject = `subject.${common.getUniqueString()}`;
		const apptContent = `content.${common.getUniqueString()}`;
		const apptLocation = `location.${common.getUniqueString()}`;
		const startTime = new Date(Date.now() + 3600000);
		const endTime = new Date(Date.now() + 7200000);
		const startIcal = startTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const endIcal = endTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const apptUid = common.getUniqueString();

		const setApptRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${apptUid}" method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${apptSubject}" loc="${apptLocation}">
							<s d="${startIcal}"/>
							<e d="${endIcal}"/>
							<or a="${accountEmail}"/>
						</inv>
						<mp content-type="text/plain">
							<content>${apptContent}</content>
						</mp>
						<su>${apptSubject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, accountToken
		);
		assert.notExists(setApptRes.Fault, 'SetAppointmentRequest should not fault');
		assert.exists(setApptRes.SetAppointmentResponse.apptId, 'Appointment ID should exist');

		// Search calendar appointments to generate cache
		const yesterday = Date.now() - 86400000;
		const tomorrow = Date.now() + 86400000;
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment" calExpandInstStart="${yesterday}" calExpandInstEnd="${tomorrow}" sortBy="none" limit="500" offset="0">
				<query>inid:"10"</query>
				<locale>en_US</locale>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Purge account calendar cache using admin SOAP
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeAccountCalendarCacheRequest id="${accountId}" xmlns="urn:zimbraAdmin">
			</PurgeAccountCalendarCacheRequest>`, adminAuthToken
		);
		assert.notExists(purgeRes.Fault, 'PurgeAccountCalendarCacheRequest should not fault');

		// Search again to regenerate cache
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment" calExpandInstStart="${yesterday}" calExpandInstEnd="${tomorrow}" sortBy="none" limit="500" offset="0">
				<query>inid:"10"</query>
				<locale>en_US</locale>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest after purge should not fault');
	});
});
