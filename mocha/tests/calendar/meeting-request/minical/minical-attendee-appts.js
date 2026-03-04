import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Minical > Minical Attendee Appts', function () {
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
	it('Sanity | Verify all status responses are available to the organizer 1', async () => {
		// Create organizer and invitee
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(orgRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = orgRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		const invRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(invRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(invRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host2 = invRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Get invitee calendar folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, invToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Create 3 appointments on different days
		const baseTime = Date.now() + 86400000;
		const subjects = [];
		const invIds = [];

		for (let i = 0; i < 3; i++) {
			const subject = `Subj${common.getUniqueString()}`;
			subjects.push(subject);
			const startMs = baseTime + i * 86400000;
			const d = new Date(startMs);
			const startStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
			const d2 = new Date(startMs + 3600000);
			const endStr = `${d2.getFullYear()}${pad(d2.getMonth() + 1)}${pad(d2.getDate())}T${pad(d2.getHours())}${pad(d2.getMinutes())}00`;

			const createRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateAppointmentRequest xmlns="urn:zimbraMail">
					<m>
						<inv>
							<comp status="CONF" fb="B" transp="O"
								allDay="0" name="${subject}">
								<or a="${orgEmail}"/>
								<at a="${invEmail}" role="REQ"
									ptst="NE" rsvp="1"/>
								<s d="${startStr}"/>
								<e d="${endStr}"/>
							</comp>
						</inv>
						<e a="${invEmail}" t="t"/>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>Content</content>
						</mp>
					</m>
				</CreateAppointmentRequest>`, orgToken
			);
			assert.notExists(createRes.Fault, `CreateAppointmentRequest ${i + 1} should not fault`);
		}

		// As invitee, search for all 3 appointments
		const searchRes = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${baseTime - 86400000}"
				calExpandInstEnd="${baseTime + 5 * 86400000}"
				types="appointment">
				<query>is:anywhere</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		assert.isAtLeast(appts.length, 3, 'Should have at least 3 appointments');

		// Accept first, Tentative second, Decline third
		const verbs = ['ACCEPT', 'TENTATIVE', 'DECLINE'];
		for (let i = 0; i < 3; i++) {
			const matchAppt = appts.find(a => a.name === subjects[i]);
			assert.exists(matchAppt, `Appointment ${i + 1} should be found`);

			const replyRes = await soap.makeSOAPEnvelopeAccount(
				`<SendInviteReplyRequest xmlns="urn:zimbraMail"
					verb="${verbs[i]}" id="${matchAppt.invId}"
					compNum="0" updateOrganizer="TRUE">
					<m rt="r">
						<e t="t" a="${orgEmail}"/>
						<su>${verbs[i]}: ${subjects[i]}</su>
						<mp ct="text/plain">
							<content>${verbs[i]}: ${subjects[i]}</content>
						</mp>
					</m>
				</SendInviteReplyRequest>`, invToken
			);
			assert.notExists(replyRes.Fault, `SendInviteReplyRequest ${verbs[i]} should not fault`);
		}

		// GetMiniCalRequest for invitee calendar
		const miniCalRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${baseTime - 86400000}"
				e="${baseTime + 3 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, invToken
		);
		assert.notExists(miniCalRes.Fault, 'GetMiniCalRequest should not fault');
		assert.notExists(miniCalRes.Fault, 'GetMiniCalResponse should exist');
	});


	it('Sanity | Verify all status responses are available to the organizer 2', async () => {
		// Create organizer and invitee
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(orgRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = orgRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		const invRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(invRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(invRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host2 = invRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create appointment
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

		// Invitee searches for the appointment
		const now = Date.now();
		const searchRes = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = appts[0].invId;

		// Decline the meeting
		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="DECLINE" id="${invInvId}"
				compNum="0" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${orgEmail}"/>
					<su>DECLINE: ${subject}</su>
					<mp ct="text/plain">
						<content>DECLINE: ${subject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, invToken
		);
		assert.notExists(replyRes.Fault, 'SendInviteReplyRequest should not fault');

		// Verify MiniCal hides declined meeting
		const miniCalRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}"
				e="${now + 3 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, invToken
		);
		assert.notExists(miniCalRes.Fault, 'GetMiniCalRequest should not fault');
		assert.notExists(miniCalRes.Fault, 'GetMiniCalResponse should exist');
	});
});
