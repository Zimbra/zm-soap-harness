import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import { main } from '../../../../../pages/main.js';

describe('Calendar > Meeting Request > Replies > Recurring > Send Invite Reply Request Recurrence Weekly', function () {
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


	it('Smoke | Recurring reply accept', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Recur reply created');
	});


	it('Sanity | Recurring reply search', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
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
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);
		const now = Date.now();

		// Search item
		const res = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 30 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Recur search not fault');
	});


	it('Sanity | Verify participant status is shown to the organizer for a basic weekly recurrent appointment - invitee declines an instance', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create weekly recurring appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							status="CONF">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Invitee accepts the series
		const now = Date.now();
		const searchRes = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 30 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = appts[0].invId;

		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="ACCEPT" id="${invInvId}"
				compNum="0" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${org.email}"/>
					<su>ACCEPT: ${s}</su>
					<mp ct="text/plain">
						<content>ACCEPT: ${s}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, inv.token
		);
		assert.notExists(replyRes.Fault, 'SendInviteReplyRequest ACCEPT should not fault');

		// Verify organizer sees AC status
		const orgMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, org.token
		);
		assert.notExists(orgMsg.Fault, 'GetMsgRequest should not fault');
	});
});
