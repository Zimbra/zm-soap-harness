import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > SmallSubdirs', function () {
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


    // MiniCal (2 tests)
    it('Smoke | MiniCal meeting request', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, inv.token
        );
        assert.notExists(res.Fault, 'MiniCal inv not fault');
    });

    it('Sanity | MiniCal meeting org', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, s);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, org.token
        );
        assert.notExists(res.Fault, 'MiniCal org not fault');
    });


    // Reminders (2 tests)
    it('Smoke | Meeting reminder', async () => {
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
							<alarm action="DISPLAY">
								<trigger>
									<rel neg="1" m="15"
										related="START"/>
								</trigger>
							</alarm>
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
        assert.notExists(res.Fault, 'Reminder not fault');
    });

    it('Sanity | Meeting reminder verify', async () => {
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
        assert.notExists(res.Fault, 'Reminder verify not fault');
    });


    // SetAppointmentRequest (2 tests)
    it('Smoke | SetAppt meeting', async () => {
        const acct = await makeAcct('set');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${s}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/>
								<e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${s}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'SetAppt not fault');
    });

    it('Sanity | SetAppt meeting verify', async () => {
        const acct = await makeAcct('set');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const create = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${s}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/>
								<e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${s}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
        );
        assert.notExists(create.Fault, 'SetAppt create not fault');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'SetAppt verify not fault');
    });
});
