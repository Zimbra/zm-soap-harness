import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > SetAppointmentRequest', function () {
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

    async function createAppt(token, email, subject) {
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, token
        );
        return res.CreateAppointmentResponse;
    }


    it('Smoke | SetAppointmentRequest basic', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'SetAppt should not fault');
    });


    it('Sanity | SetAppointmentRequest then get', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        const calItemId = res.SetAppointmentResponse.calItemId;
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${calItemId}"/>`, acct.token
        );
        assert.notExists(getRes.Fault, 'Get should not fault');
    });


    it('Sanity | SetAppointmentRequest search', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
    });


    it('Sanity | SetAppointmentRequest modify', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | SetAppointmentRequest delete', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Delete should not fault');
    });


    it('Sanity | SetAppointmentRequest with invitee', async () => {
        const acct = await makeAcct('sa');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<at a="${inv.email}" role="REQ"
									ptst="NE" rsvp="1"/>
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<e a="${inv.email}" t="t"/>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | SetAppointmentRequest all-day', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const d = new Date(Date.now() + 86400000);
        const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="F"
								transp="O" status="CONF"
								allDay="1">
								<s d="${dateStr}"/>
								<e d="${dateStr}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'All-day should not fault');
    });


    it('Sanity | SetAppointmentRequest cancel', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
        );
        assert.notExists(cancelRes.Fault, 'Cancel should not fault');
    });


    it('Sanity | SetAppointmentRequest except', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
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
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.exists(
            res.CreateAppointmentResponse.calItemId,
            'Recurring for exception should be created'
        );
    });


    it('Sanity | SetAppointmentRequest recur', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
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
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Recurring should not fault');
    });


    it('Sanity | Appointment-Set basic create', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        assert.exists(appt.calItemId, 'Should be created');
    });


    it('Sanity | Appointment-Set verify get', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Get should not fault');
    });


    it('Sanity | Appointment-Set search verify', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
    });


    it('Sanity | Appointment-Set with attendee', async () => {
        const acct = await makeAcct('sa');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Appointment-Set modify verify', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Appointment-Set recurring', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
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
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.exists(
            res.CreateAppointmentResponse.calItemId,
            'Recurring should be created'
        );
    });


    it('Sanity | Appointment-Set free/busy verify', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });


    it('Sanity | Appointment-Set delete verify', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject
        );
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(delRes.Fault, 'Delete should not fault');
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.exists(getRes.Fault, 'Deleted should fault');
    });
});
