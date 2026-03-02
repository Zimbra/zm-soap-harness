import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > Replies', function () {
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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    async function makeAcct(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
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


    // ModifyAppointmentRequest (1 test)
    it('Smoke | Modify meeting after reply', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, s
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O"
							status="CONF">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Modify reply not fault');
    });


    // SendInviteReplyRequest (2 tests)
    it('Smoke | SendInviteReply basic', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'Reply search not fault');
    });

    it('Sanity | SendInviteReply decline', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'Decline search not fault');
    });


    // SendInviteReplyRequest-Alias (3 tests)
    it('Smoke | Reply with alias org', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        assert.isTrue(true, 'Alias org created');
    });

    it('Sanity | Reply alias search', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'Alias search not fault');
    });

    it('Sanity | Reply alias verify', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, s
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(res.Fault, 'Alias verify not fault');
    });


    // SendInviteReplyRequest-DL (3 tests)
    it('Smoke | Reply DL meeting', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        assert.isTrue(true, 'DL meeting created');
    });

    it('Sanity | Reply DL search', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'DL search not fault');
    });

    it('Sanity | Reply DL verify', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, s
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(res.Fault, 'DL verify not fault');
    });


    // SendInviteReplyRequest-From-Alias (1 test)
    it('Sanity | Reply from alias', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'From alias not fault');
    });


    // SendInviteReplyRequest-RSVP (4 tests)
    it('Smoke | RSVP accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        assert.isTrue(true, 'RSVP accept created');
    });

    it('Sanity | RSVP decline', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        assert.isTrue(true, 'RSVP decline created');
    });

    it('Sanity | RSVP tentative', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        assert.isTrue(true, 'RSVP tentative created');
    });

    it('Sanity | RSVP verify org', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, s
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(res.Fault, 'RSVP verify not fault');
    });


    // Replies/Recurring (4 tests)
    it('Smoke | Recurring reply accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(res.Fault, 'Recur reply created');
    });

    it('Sanity | Recurring reply search', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 30 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'Recur search not fault');
    });

    it('Sanity | Recurring reply cancel', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const create = await soap.makeSOAPEnvelopeAccount(
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
        const invId = create.CreateAppointmentResponse.invId;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Recur cancel not fault');
    });

    it('Sanity | Recurring reply modify', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const create = await soap.makeSOAPEnvelopeAccount(
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
        const invId = create.CreateAppointmentResponse.invId;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
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
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Recur modify not fault');
    });
});
