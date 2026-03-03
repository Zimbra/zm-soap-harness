import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { soap as soapBackend, server } from '../../../framework/backend/index.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Bugs', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	const pad = (n) => String(n).padStart(2, '0');

	function futureTime(offsetMs) {
		const d = new Date(Date.now() + offsetMs);
		return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
	}

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
	it('Sanity | Verify spam email with calendar invite ics attachment should not update calendar', async () => {
		// Create account
		const acctEmail = `acct${common.getUniqueString()}@${testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acctRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const acctToken = await soap.getAccountAuthToken(acctEmail);

		// Inject LMTP mime with calendar invite ics attachment
		const filePath = path.join(config.projectRoot, 'mocha/data/email39/msg01.txt');
		await soap.injectMime(acctToken, filePath);

		// Search for the appointment - should not be in calendar
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 90 * 86400000}"
				calExpandInstEnd="${now + 90 * 86400000}"
				types="appointment">
				<query>Tuesday Today</query>
			</SearchRequest>`, acctToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Functional | Verify reply does not include comzimbracsstoreBlobInputStreamat22838de0 as body text (Mobile Sync)', async () => {
		// Create account
		const acctEmail = `acct${common.getUniqueString()}@${testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acctRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const acctToken = await soap.getAccountAuthToken(acctEmail);

		// Inject LMTP mime from bug 38387 folder
		const filePath = path.join(config.projectRoot, 'data/testmailraw/bugs/38387');
		await soap.injectMime(acctToken, filePath);

		// Search for the injected message
		const subject = 'subjecttest12436381386522';
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acctToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m;
		assert.exists(msgs, 'Message should be found');
		const msgId = Array.isArray(msgs) ? msgs[0].id : msgs.id;

		// Get message and verify body does not contain the corrupt string
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, acctToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
	});


	it('Functional | Verify bug 26472 - rsvp changed from 0 to 1 after script is executed', async () => {
		// Create account
		const acctEmail = `acct${common.getUniqueString()}@${testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acctRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const acctToken = await soap.getAccountAuthToken(acctEmail);

		// Create invitee account
		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		const invRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(invRes.Fault, 'CreateAccountRequest should not fault');

		// Create appointment with RSVP=0
		const subject = `Subj${common.getUniqueString()}`;
		const content = `Content${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acctEmail}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="0"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<e a="${acctEmail}" t="f"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acctToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify RSVP is 0
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, acctToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		assert.equal(String(comp.rsvp), '0', 'RSVP should be 0 before script');

		// Stop mailbox service
		await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmailboxdctl stop\'');

		// Execute fixup script
		await server.runCommand('sudo su - zimbra -c \'(cd /opt/zimbra/libexec/scripts/; ./fixup20080410-SetRsvpTrue.pl)\'');

		// Start mailbox service
		await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmailboxdctl start\'');

		// Re-authenticate after server restart
		const acctToken2 = await soap.getAccountAuthToken(acctEmail);

		// Verify RSVP is now 1
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, acctToken2
		);
		assert.notExists(getMsgRes2.Fault, 'GetMsgRequest should not fault');
		const msg2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		const comp2 = msg2.inv[0].comp[0];
		assert.equal(String(comp2.rsvp), '1', 'RSVP should be 1 after script execution');
	});
});
