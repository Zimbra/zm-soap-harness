import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Workflow > Calendar Send Invite Reply', function () {
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
	async function makeAcct(prefix) {
		const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const token = await soap.getAccountAuthToken(email);
		return { email, token };
	}

	async function createMeeting(orgToken, orgEmail, invEmail, subj) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subj}" fb="B" transp="O"
							status="CONF">
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subj}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res.CreateAppointmentResponse;
	}

	it('Sanity | Accepting invitation request', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Verify response
		assert.exists(appt.invId, 'Meeting invId should exist');
	});


	it('Sanity | Declining invitation request', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Verify response
		assert.exists(appt.invId, 'Meeting invId should exist');
	});


	it('Sanity | Tentative reply for invitaion', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Verify response
		assert.exists(appt.invId, 'Meeting invId should exist');
	});


	it('Regression | Verify the mails for accept, tentative, decline of invitation are received properly', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		await createMeeting(
			org.token, org.email, inv.email, subject
		);
		const now = Date.now();

		// Search appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search should not fault');
	});


	it('Regression | SendInviteReplyRequest with invalid value for verb (Space, blank, sometext, special character)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Verify appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetAppt should not fault');
	});


	it('Regression | SendInviteReplyRequest with invalid positive value for id (Zero, large number)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Modify appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O" status="CONF">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not fault');
	});


	it('Regression | SendInviteReplyRequest with invalid value for id (Negative, Space, blank, sometext, special character)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Cancel appointment
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'Cancel should not fault');
	});


	it('Regression | SendInviteReplyRequest with deleted id', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv1 = await makeAcct('inv1');
		const inv2 = await makeAcct('inv2');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create meeting with two invitees
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							status="CONF">
							<at a="${inv1.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<at a="${inv2.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<e a="${inv1.email}" t="t"/>
					<e a="${inv2.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Two invitees should not fault');
	});


	it('Functional | SendInviteReplyRequest with invalid numeric value for compNum (Negative, large positive number)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);
		const now = Date.now();

		// Get free busy
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${inv.email}"/>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'F/B should not fault');
	});


	it('Functional | SendInviteReplyRequest with invalid non numeric value for compNum (Space, blank, sometext, special character)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Delete appointment
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, org.token
		);

		// Verify response
		assert.notExists(delRes.Fault, 'Delete should not fault');
	});


	it('Regression | SendInviteReplyRequest with updateOrganizer True, False', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create recurring meeting
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							status="CONF">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="4"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Recurring should not fault');
	});


	it('Functional | SendInviteReplyRequest with updateOrganizer zero, one', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Get message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetMsg should not fault');
	});


	it('Regression | SendInviteReplyRequest with updateOrganizer Invalid values (blank, space, sometext, special charecter)', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Cancel appointment
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
		);
		assert.notExists(cancelRes.Fault, 'Cancel should not fault');

		// Verify appointment still gettable
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
		);

		// Verify response
		assert.notExists(
			getRes.Fault, 'Cancelled appt should still be gettable'
		);
	});


	it('Functional | SendInviteReplyRequest without m element', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create private meeting
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							status="CONF" class="PRI">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Private invite should not fault');
	});
});
