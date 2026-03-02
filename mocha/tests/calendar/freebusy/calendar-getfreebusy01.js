import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > FreeBusy > Calendar-Getfreebusy01', function () {
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

    async function createApptWithFB(token, email, attendee, subject, fb) {
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        return soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="${fb}"
						transp="O" allDay="0" name="${subject}">
						<at role="OPT" ptst="NE" rsvp="1"
							a="${attendee}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${email}"/>
					</inv>
					<e a="${attendee}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
    }


    it('Smoke | GetFreeBusyRequest with valid values', async () => {
        const acct = await makeAcct('acct');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'F/B data should exist'
        );
    });


    it('Sanity | GetFreeBusy status of attendees', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'B'
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


    it('Sanity | GetFreeBusy after attendee accepts', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'B'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy when account is free', async () => {
        const acct = await makeAcct('acct');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'F/B data should exist'
        );
    });


    it('Sanity | GetFreeBusy when account is busy all day', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'B'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy when status is tentative', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'T'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy when status is unknown', async () => {
        const acct1 = await makeAcct('acct1');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy when status is Out of Office', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'O'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy with daily recurring appointment', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B"
						transp="O" allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
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
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 7 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy after accept and then decline', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'B'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy for new account not logged in', async () => {
        const newAcct = `newacc${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newAcct}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );

        const acct = await makeAcct('caller');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${newAcct}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy setup shared busy', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const subject = `Subj${common.getUniqueString()}`;
        await createApptWithFB(
            acct1.token, acct1.email, acct2.email, subject, 'B'
        );

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy using uid (email)', async () => {
        const acct1 = await makeAcct('acct1');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'F/B data should exist'
        );
    });


    it('Sanity | GetFreeBusy using id (UUID)', async () => {
        const acct1 = await makeAcct('acct1');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy using name (email)', async () => {
        const acct1 = await makeAcct('acct1');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct1.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetFreeBusy using uid (UUID) form 2', async () => {
        const acct1 = await makeAcct('acct1');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct1.id}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });
});
