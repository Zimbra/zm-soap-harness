import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > FreeBusy > Calendar-Getfreebusy', function () {
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

    let acct1, acct2, acct3;

    before(async function () {
        const e1 = `acct1${common.getUniqueString()}@${testDomain}`;
        const e2 = `acct2${common.getUniqueString()}@${testDomain}`;
        const e3 = `acct3${common.getUniqueString()}@${testDomain}`;
        for (const email of [e1, e2, e3]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const r1 = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${e1}</account>
			</GetAccountRequest>`, adminAuthToken
        );
        const id1 = r1.GetAccountResponse.account[0].id;
        acct1 = {
            email: e1, id: id1,
            token: await soap.getAccountAuthToken(e1)
        };
        acct2 = {
            email: e2,
            token: await soap.getAccountAuthToken(e2)
        };
        acct3 = {
            email: e3,
            token: await soap.getAccountAuthToken(e3)
        };
    });


    it('Smoke | GetFreeBusyRequest with valid s, e and uid', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 5000}"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'User F/B data should exist'
        );
    });


    it('Regression | GetFreeBusyRequest with blank s and e', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="calendar.blank" e="calendar.blank"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for blank s/e');
    });


    it('Regression | GetFreeBusyRequest with text s and e', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="some text" e="some text"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for text s/e');
    });


    it('Regression | GetFreeBusyRequest with very large s and e', async () => {
        const now = Date.now();
        const big = `${now}${now}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${big}" e="${big}"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for large values');
    });


    it('Regression | GetFreeBusyRequest with uid leading spaces', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 5000}"
				uid="   ${acct1.id}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'User data should exist'
        );
    });


    it('Regression | GetFreeBusyRequest with uid trailing spaces', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 5000}"
				uid="${acct1.id}   "/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'User data should exist'
        );
    });


    it('Regression | GetFreeBusyRequest with blank uid', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 5000}"
				uid=""/>`, acct1.token
        );
        // Blank uid returns response with usr element
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Regression | GetFreeBusyRequest with sometext uid', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 5000}"
				uid="some text"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Regression | GetFreeBusyRequest without s and e', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.exists(
            res.Fault,
            'Should fault without s and e'
        );
    });


    it('Regression | GetFreeBusyRequest without uid', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.exists(
            res.Fault,
            'Should fault without uid'
        );
    });


    it('Sanity | GetFreeBusy status after creating appointment', async () => {
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B"
						transp="O" allDay="0" name="${subject}">
						<at role="OPT" ptst="NE" rsvp="1"
							a="${acct2.email}"/>
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

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'F/B data should exist'
        );
    });


    it('Sanity | Login to test account', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetInfoRequest xmlns="urn:zimbraAccount"
				sections="mbox"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'GetInfo should not fault');
    });
});
