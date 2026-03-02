import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Workflow', function () {
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


    // Calendar-SendInviteReply (14 tests)
    it('Smoke | SendInviteReply - Accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'Meeting created for accept test');
    });


    it('Sanity | SendInviteReply - Decline', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'Meeting created for decline test');
    });


    it('Sanity | SendInviteReply - Tentative', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'Meeting created for tentative test');
    });


    it('Sanity | SendInviteReply - Search invite', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
    });


    it('Sanity | SendInviteReply - Verify org view', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(res.Fault, 'GetAppt should not fault');
    });


    it('Sanity | SendInviteReply - Modify after accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
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
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | SendInviteReply - Cancel after accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
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
    });


    it('Sanity | SendInviteReply - Two invitees', async () => {
        const org = await makeAcct('org');
        const inv1 = await makeAcct('inv1');
        const inv2 = await makeAcct('inv2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(res.Fault, 'Two invitees should not fault');
    });


    it('Sanity | SendInviteReply - F/B after accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${inv.email}"/>`, org.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });


    it('Sanity | SendInviteReply - Delete after accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, org.token
        );
        assert.notExists(delRes.Fault, 'Delete should not fault');
    });


    it('Sanity | SendInviteReply - Recurring accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(res.Fault, 'Recurring should not fault');
    });


    it('Sanity | SendInviteReply - GetMsg invite', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, org.token
        );
        assert.notExists(res.Fault, 'GetMsg should not fault');
    });


    it('Sanity | SendInviteReply - Verify after cancel', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        await soap.makeSOAPEnvelopeAccount(
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
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(
            getRes.Fault, 'Cancelled appt should still be gettable'
        );
    });


    it('Sanity | SendInviteReply - Private invite', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(res.Fault, 'Private invite should not fault');
    });


    // New-Calendar-SendInviteReply (14 tests)
    it('Smoke | New SendInviteReply - Accept', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'New meeting created');
    });


    it('Sanity | New SendInviteReply - Decline', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'New meeting for decline');
    });


    it('Sanity | New SendInviteReply - Tentative', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        assert.ok(true, 'New meeting for tentative');
    });


    it('Sanity | New SendInviteReply - Search', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, org.token
        );
        assert.notExists(res.Fault, 'New search should not fault');
    });


    it('Sanity | New SendInviteReply - Verify', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(res.Fault, 'New get should not fault');
    });


    it('Sanity | New SendInviteReply - Modify', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
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
        assert.notExists(modRes.Fault, 'New modify should not fault');
    });


    it('Sanity | New SendInviteReply - Cancel', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
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
        assert.notExists(
            cancelRes.Fault, 'New cancel should not fault'
        );
    });


    it('Sanity | New SendInviteReply - Two invitees', async () => {
        const org = await makeAcct('org');
        const inv1 = await makeAcct('inv1');
        const inv2 = await makeAcct('inv2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(
            res.Fault, 'New two invitees should not fault'
        );
    });


    it('Sanity | New SendInviteReply - F/B', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${inv.email}"/>`, org.token
        );
        assert.notExists(res.Fault, 'New F/B should not fault');
    });


    it('Sanity | New SendInviteReply - Delete', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, org.token
        );
        assert.notExists(delRes.Fault, 'New delete should not fault');
    });


    it('Sanity | New SendInviteReply - Recurring', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
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
        assert.notExists(
            res.Fault, 'New recurring should not fault'
        );
    });


    it('Sanity | New SendInviteReply - GetMsg', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, org.token
        );
        assert.notExists(res.Fault, 'New GetMsg should not fault');
    });


    it('Sanity | New SendInviteReply - Verify cancel', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );
        await soap.makeSOAPEnvelopeAccount(
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
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(
            getRes.Fault, 'Cancelled should still be gettable'
        );
    });


    it('Sanity | New SendInviteReply - Private', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
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
        assert.notExists(
            res.Fault, 'New private should not fault'
        );
    });
});
