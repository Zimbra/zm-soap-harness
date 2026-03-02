import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Appointment-Modify', function () {
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

    async function createAppointment(token, orgEmail, subject, loc, time1, time2, attendees) {
        const atStr = (attendees || []).map(
            a => `<at role="OPT" ptst="NE" rsvp="1" a="${a}"/>`
        ).join('');
        const eStr = (attendees || []).map(
            a => `<e a="${a}" t="t"/>`
        ).join('');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="${loc}">
						${atStr}
						<s d="${time1}"/>
						<e d="${time2}"/>
						<or a="${orgEmail}"/>
					</inv>
					${eStr}
					<mp content-type="text/plain">
						<content>Content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
        return res;
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


    it('Smoke | Modify an appointment with valid values', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const newSubject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const newLoc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);
        const t3 = futureTime(86400000);
        const t4 = futureTime(86400000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);
        assert.isNotNull(invId, 'Appointment should exist');

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}"
						loc="${newLoc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t3}"/>
						<e d="${t4}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Updated content</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'ModifyAppointment should not fault');
    });


    it('Functional | Modify an appointment but leave all fields the same', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);
        assert.isNotNull(invId, 'Appointment should exist');

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Same content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'ModifyAppointment should not fault');
    });


    it('Functional | Modify an appointment multiple (3) times', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );

        for (let i = 0; i < 3; i++) {
            const invId = await getApptInvId(acct1.token, subject);
            assert.isNotNull(invId, `Appointment should exist (iteration ${i})`);
            const modRes = await soap.makeSOAPEnvelopeAccount(
                `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
					id="${invId}" comp="0">
					<m>
						<inv method="REQUEST" type="event" fb="B" transp="O"
							status="CONF" allDay="0" name="${subject}"
							loc="${loc}">
							<at role="OPT" ptst="NE" rsvp="1"
								a="${acct2.email}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct1.email}"/>
						</inv>
						<e a="${acct2.email}" t="t"/>
						<mp content-type="text/plain">
							<content>Modify ${i}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</ModifyAppointmentRequest>`, acct1.token
            );
            assert.notExists(modRes.Fault, `Modify ${i} should not fault`);
        }
    });


    it('Functional | Modify appointment with non-existing attendee', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const nonExisting = `nonexist${common.getUniqueString()}@${testDomain}`;
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(86400000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);
        assert.isNotNull(invId, 'Appointment should exist');

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${nonExisting}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${nonExisting}" t="t"/>
					<mp content-type="text/plain">
						<content>Non-existing attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify with non-existing should not fault');
    });


    it('Regression | Modify appointment with alphabetic start/end time', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(86400000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);
        assert.isNotNull(invId, 'Appointment should exist');

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<s d="aaaa"/>
						<e d="bbbb"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Invalid time</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.exists(modRes.Fault, 'Should fault with invalid time');
    });


    it('Functional | Modify appointment inviting multiple people', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const acct4 = await createAccountAndToken('acct4');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2,
            [acct2.email, acct4.email]
        );
        const invId = await getApptInvId(acct1.token, subject);
        assert.isNotNull(invId, 'Appointment should exist');

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<at role="OPT" ptst="NE" rsvp="1" a="${acct4.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<e a="${acct4.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Multi attendee modify</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment with one non-existing attendee in multi', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const nonExist = `nonex${common.getUniqueString()}@${testDomain}`;
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(86400000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct2.email}"/>
						<at role="OPT" ptst="NE" rsvp="1" a="${nonExist}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct2.email}" t="t"/>
					<e a="${nonExist}" t="t"/>
					<mp content-type="text/plain">
						<content>Mixed attendees</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Modify appointment with all non-existing attendees', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const nonExist1 = `ne1${common.getUniqueString()}@${testDomain}`;
        const nonExist2 = `ne2${common.getUniqueString()}@${testDomain}`;
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(86400000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct2.email]
        );
        const invId = await getApptInvId(acct1.token, subject);

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${nonExist1}"/>
						<at role="OPT" ptst="NE" rsvp="1" a="${nonExist2}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${nonExist1}" t="t"/>
					<e a="${nonExist2}" t="t"/>
					<mp content-type="text/plain">
						<content>All nonexist attendees</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | Modify appointment with deleted attendee account', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct6 = await createAccountAndToken('acct6');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct6.email]
        );
        const invId = await getApptInvId(acct1.token, subject);

        // Delete attendee account
        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct6.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
        );

        // Modify should still work
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct6.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct6.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Deleted attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | Modify appointment with locked attendee', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct7 = await createAccountAndToken('acct7');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct7.email]
        );
        const invId = await getApptInvId(acct1.token, subject);

        // Lock the attendee account
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct7.id}</id>
				<a n="zimbraAccountStatus">locked</a>
			</ModifyAccountRequest>`, adminAuthToken
        );

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct7.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct7.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Locked attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | Modify appointment with closed attendee', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct8 = await createAccountAndToken('acct8');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, [acct8.email]
        );
        const invId = await getApptInvId(acct1.token, subject);

        // Close the attendee account
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct8.id}</id>
				<a n="zimbraAccountStatus">closed</a>
			</ModifyAccountRequest>`, adminAuthToken
        );

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<at role="OPT" ptst="NE" rsvp="1" a="${acct8.email}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${acct8.email}" t="t"/>
					<mp content-type="text/plain">
						<content>Closed attendee</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Regression | PERM_DENIED when modifying another users appointment', async () => {
        const acct1 = await createAccountAndToken('acct1');
        const acct2 = await createAccountAndToken('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const loc = `Loc${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        // Create appointment as acct1
        const createRes = await createAppointment(
            acct1.token, acct1.email, subject, loc, t1, t2, []
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Try to modify as acct2
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${loc}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct2.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Unauthorized modify</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct2.token
        );
        assert.exists(modRes.Fault, 'Should fault - PERM_DENIED');
    });
});
