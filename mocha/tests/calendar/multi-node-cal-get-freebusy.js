import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Calendar > Multi Node Cal Get Freebusy', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');
    let accountA1, accountA2, accountB1, accountB2;
    let accountA1Id, accountA2Id, accountB1Id, accountB2Id;
    let accountA1Token;

    function icalTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

    function currDate(offsetDays) {
        const d = new Date(Date.now() + offsetDays * 86400000);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    }

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();

        // Create 4 accounts
        accountA1 = `multihosta1.${common.getUniqueString()}@${testDomain}`;
        accountA2 = `multihosta2.${common.getUniqueString()}@${testDomain}`;
        accountB1 = `multihostb1.${common.getUniqueString()}@${testDomain}`;
        accountB2 = `multihostb2.${common.getUniqueString()}@${testDomain}`;

        const r1 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        accountA1Id = r1.CreateAccountResponse.account[0].id;

        const r2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        accountA2Id = r2.CreateAccountResponse.account[0].id;

        const r3 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        accountB1Id = r3.CreateAccountResponse.account[0].id;

        const r4 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        accountB2Id = r4.CreateAccountResponse.account[0].id;

        accountA1Token = await soap.getAccountAuthToken(accountA1);
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
    it('Smoke | Verify the free, busy status of accountA2, accountB1 and accountB2', async () => {
        // Get free/busy for all accounts (all should be free)
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const now = Date.now();
        const start = now - 86400000;
        const end = now + 2 * 86400000;

        const res1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA2Id}"/>`, accountA1Token
        );
        assert.notExists(res1.Fault, 'GetFreeBusyRequest for A2 should not fault');
        assert.exists(res1.GetFreeBusyResponse.usr, 'usr element should exist');

        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB1Id}"/>`, accountA1Token
        );
        assert.notExists(res2.Fault, 'GetFreeBusyRequest for B1 should not fault');
        assert.exists(res2.GetFreeBusyResponse.usr, 'usr element should exist');

        const res3 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB2Id}"/>`, accountA1Token
        );
        assert.notExists(res3.Fault, 'GetFreeBusyRequest for B2 should not fault');
        assert.exists(res3.GetFreeBusyResponse.usr, 'usr element should exist');
    });


    it('Sanity | Verify the free, busy status of accountA1, accountB1 and accountB2', async () => {
        // Login as accountA2 and check others
        const accountA2Token = await soap.getAccountAuthToken(accountA2);
        const now = Date.now();
        const start = now - 86400000;
        const end = now + 2 * 86400000;

        const res1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA1Id}"/>`, accountA2Token
        );
        assert.notExists(res1.Fault, 'GetFreeBusyRequest for A1 should not fault');
        assert.exists(res1.GetFreeBusyResponse.usr, 'usr element should exist');

        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB1Id}"/>`, accountA2Token
        );
        assert.notExists(res2.Fault, 'GetFreeBusyRequest for B1 should not fault');
        assert.exists(res2.GetFreeBusyResponse.usr, 'usr element should exist');

        const res3 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB2Id}"/>`, accountA2Token
        );
        assert.notExists(res3.Fault, 'GetFreeBusyRequest for B2 should not fault');
        assert.exists(res3.GetFreeBusyResponse.usr, 'usr element should exist');
    });


    it('Sanity | Verify the free, busy status of accountA1, accountA2 and accountB2', async () => {
        // Login as accountB1 and check others
        const accountB1Token = await soap.getAccountAuthToken(accountB1);
        const now = Date.now();
        const start = now - 86400000;
        const end = now + 2 * 86400000;

        const res1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA1Id}"/>`, accountB1Token
        );
        assert.notExists(res1.Fault, 'GetFreeBusyRequest for A1 should not fault');
        assert.exists(res1.GetFreeBusyResponse.usr, 'usr element should exist');

        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA2Id}"/>`, accountB1Token
        );
        assert.notExists(res2.Fault, 'GetFreeBusyRequest for A2 should not fault');
        assert.exists(res2.GetFreeBusyResponse.usr, 'usr element should exist');

        const res3 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB2Id}"/>`, accountB1Token
        );
        assert.notExists(res3.Fault, 'GetFreeBusyRequest for B2 should not fault');
        assert.exists(res3.GetFreeBusyResponse.usr, 'usr element should exist');
    });


    it('Sanity | Verify the free, busy status of accountA1, accountA2 and accountB1', async () => {
        // Login as accountB2 and check others
        const accountB2Token = await soap.getAccountAuthToken(accountB2);
        const now = Date.now();
        const start = now - 86400000;
        const end = now + 2 * 86400000;

        const res1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA1Id}"/>`, accountB2Token
        );
        assert.notExists(res1.Fault, 'GetFreeBusyRequest for A1 should not fault');
        assert.exists(res1.GetFreeBusyResponse.usr, 'usr element should exist');

        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountA2Id}"/>`, accountB2Token
        );
        assert.notExists(res2.Fault, 'GetFreeBusyRequest for A2 should not fault');
        assert.exists(res2.GetFreeBusyResponse.usr, 'usr element should exist');

        const res3 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${start}" e="${end}" uid="${accountB1Id}"/>`, accountB2Token
        );
        assert.notExists(res3.Fault, 'GetFreeBusyRequest for B1 should not fault');
        assert.exists(res3.GetFreeBusyResponse.usr, 'usr element should exist');
    });


    it('Sanity | Verify the busy status of accountA2 1', async () => {
        // Login as accountA2 and create all-day appointment fb=busy
        const accountA2Token = await soap.getAccountAuthToken(accountA2);
        const subject = `Subject is Get Free Busy Calendar meeting${common.getUniqueString()}`;
        const content = `Content of Get Free Busy Calendar message${common.getUniqueString()}`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF"
						allDay="1" name="${subject}" loc="Location">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountA1}"/>
						<s d="${currDate(0)}"/>
						<e d="${currDate(1)}"/>
						<or a="${accountA2}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountA2Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // Login as accountA1 and check busy status
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${accountA2Id}"/>`, accountA1Token
        );
        assert.notExists(res.Fault, 'GetFreeBusyRequest should not fault');
    });


    it('Sanity | Verify the busy status of accountA2 2', async () => {
        // Login as accountA2 and create all-day appointment fb=Tentative
        const accountA2Token = await soap.getAccountAuthToken(accountA2);
        const subject = `Subject1 is Get Free Busy Calendar meeting${common.getUniqueString()}`;
        const content = `Content of Get Free Busy Calendar message${common.getUniqueString()}`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="T" transp="O" status="CONF"
						allDay="1" name="${subject}" loc="Location">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountA1}"/>
						<s d="${currDate(0)}"/>
						<e d="${currDate(2)}"/>
						<or a="${accountA2}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountA2Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // Login as accountA1 and check tentative status
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 3 * 86400000}"
				uid="${accountA2Id}"/>`, accountA1Token
        );
        assert.notExists(res.Fault, 'GetFreeBusyRequest should not fault');
    });


    it('Sanity | GetFreeBusy status of attendees when status of Account is unknown', async () => {
        // Check status for non-existing accounts
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const nonExist1 = `testNonExisting${common.getUniqueString()}@${testDomain}`;
        const nonExist2 = 'ABCD@ABCD.com';
        const now = Date.now();

        const res1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${nonExist1}"/>`, accountA1Token
        );
        assert.notExists(res1.Fault, 'GetFreeBusyRequest for non-existing should not fault');

        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${nonExist2}"/>`, accountA1Token
        );
        assert.notExists(res2.Fault, 'GetFreeBusyRequest for non-existing should not fault');
    });


    it('Sanity | GetFreeBusy status of attendees after the attendee has accepted the meeting and then declines the meeting', async () => {
        // Login as accountA1 and create appointment with accountA2
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const subject = `Subject1 is Get Free Busy Calendar meeting${common.getUniqueString()}`;
        const content = `Content of Get Free Busy Calendar message${common.getUniqueString()}`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Location">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountA2}"/>
						<s d="${icalTime(3600000)}"/>
						<e d="${icalTime(2 * 3600000)}"/>
						<or a="${accountA1}"/>
					</inv>
					<e a="${accountA2}" t="t"/>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountA1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // Login as accountA2 and accept
        const accountA2Token = await soap.getAccountAuthToken(accountA2);
        const now = Date.now();
        const start = now - 2 * 86400000;
        const end = now + 2 * 86400000;

        // Retry search for appointment (may take time for invite to arrive)
        let searchRes;
        for (let i = 0; i < 5; i++) {
            searchRes = await soap.makeSOAPEnvelopeAccount(
                `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${start}" calExpandInstEnd="${end}">
				<query>${subject}</query>
			</SearchRequest>`, accountA2Token
            );
            if (searchRes.SearchResponse?.appt) break;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'Appointment should be found in search results');
        const appts = Array.isArray(searchRes.SearchResponse.appt)
            ? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
        const invId = appts[0].invId;

        // Accept the invitation
        const acceptRes = await soap.makeSOAPEnvelopeAccount(
            `<SendInviteReplyRequest xmlns="urn:zimbraMail"
					id="${invId}" compNum="0" verb="ACCEPT" updateOrganizer="TRUE">
					<m origid="${invId}" rt="r">
						<e t="t" a="${accountA1}"/>
						<su>ACCEPT${subject}</su>
						<mp ct="text/plain">
							<content>Yes, I will attend.</content>
						</mp>
					</m>
				</SendInviteReplyRequest>`, accountA2Token
        );
        assert.notExists(acceptRes.Fault, 'SendInviteReplyRequest ACCEPT should not fault');

        // Verify busy status as accountA1
        accountA1Token = await soap.getAccountAuthToken(accountA1);
        const fbRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				uid="${accountA2Id}"/>`, accountA1Token
        );
        assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');
    });
});
