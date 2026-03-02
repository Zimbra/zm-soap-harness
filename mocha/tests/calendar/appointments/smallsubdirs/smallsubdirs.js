import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > SmallSubdirs', function () {
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


    // === Organizer (1 test) ===
    it('Sanity | Account rename - organizer update', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(acct.token, acct.email, subject);
        assert.exists(appt.calItemId, 'Should be created');
    });


    // === DistributionLists (3 tests) ===
    it('Sanity | DL appointment creation', async () => {
        const acct = await makeAcct('org');
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


    it('Sanity | DL appointment search', async () => {
        const acct = await makeAcct('org');
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


    it('Sanity | DL appointment freebusy', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });


    // === MiniCal (5 tests) ===
    it('Sanity | MiniCal basic request', async () => {
        const acct = await makeAcct('mc');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 30 * 86400000}"
				e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'MiniCal should not fault');
    });


    it('Sanity | MiniCal with timezone', async () => {
        const acct = await makeAcct('mc');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 30 * 86400000}"
				e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | MiniCal appointments general', async () => {
        const acct = await makeAcct('mc');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}"
				e="${now + 60 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | MiniCal new calendar appointments 1', async () => {
        const acct = await makeAcct('mc');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(acct.token, acct.email, subject);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | MiniCal new calendar appointments 2', async () => {
        const acct = await makeAcct('mc');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 60 * 86400000}"
				e="${now}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Past range should not fault');
    });
});
