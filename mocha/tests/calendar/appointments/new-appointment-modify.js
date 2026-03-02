import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > New-Appointment-Modify', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTimeFromEpoch(epochMs) {
        const d = new Date(epochMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

    function futureTime(offsetMs) {
        return icalTimeFromEpoch(Date.now() + offsetMs);
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

    async function createAccountAndToken(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const id = res.CreateAccountResponse.account[0].id;
        const token = await soap.getAccountAuthToken(email);
        return { email, id, token };
    }

    async function getApptInvId(token, subject) {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"/>`,
            token
        );
        if (!res.GetApptSummariesResponse.appt) return null;
        const appts = Array.isArray(res.GetApptSummariesResponse.appt)
            ? res.GetApptSummariesResponse.appt
            : [res.GetApptSummariesResponse.appt];
        const found = appts.find(a => a.name === subject);
        return found ? found.invId : null;
    }


    it('Smoke | Create and modify appointment subject', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const newSubject = `NewSubj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Updated content</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Smoke | Create and modify appointment location', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const newLoc = `NewLoc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="${loc}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}"
						loc="${newLoc}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Updated location</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Create and modify appointment time', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);
        const newT1 = futureTime(86400000);
        const newT2 = futureTime(90000000);

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${newT1}"/>
						<e d="${newT2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Updated time</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Create and modify appointment content', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Original content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>New content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Modify appointment adding an attendee', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        const invId = await getApptInvId(acct1.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Added attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Modify appointment removing an attendee', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        const invId = await getApptInvId(acct1.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Removed attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment free/busy status', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="F" transp="T"
						status="CONF" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Changed to free</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment to all day', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="F" transp="O"
						status="CONF" allDay="1" name="${subject}">
						<s d="20250101"/>
						<e d="20250101"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Changed to all day</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment adding recurrence', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
									<count num="5"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp content-type="text/plain">
						<content>Added recurrence</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | Modify with canceled attendee deleted 1', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        const invId = await getApptInvId(acct1.token, subject);

        // Delete attendee
        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct2.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
        );

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Modified with deleted</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | Modify with canceled attendee deleted 2', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        const invId = await getApptInvId(acct1.token, subject);

        // Delete attendee
        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct2.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
        );

        // Modify appointment after attendee deleted (update subject)
        const newSubject = `Updated${common.getUniqueString()}`;
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Removed deleted attendee</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment adding alarm/reminder', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" m="15"/>
							</trigger>
							<desc>Reminder</desc>
						</alarm>
					</inv>
					<mp content-type="text/plain">
						<content>Added alarm</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment changing privacy class', async () => {
        const acct = await createAccountAndToken('acct');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = await getApptInvId(acct.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" class="PRI">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Changed to private</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });
});
