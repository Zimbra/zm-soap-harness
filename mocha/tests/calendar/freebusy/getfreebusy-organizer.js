import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > FreeBusy > GetFreeBusy-Organizer', function () {
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


    it('Smoke | Organizer GetFreeBusy after creating appointment', async () => {
        const acct1 = await makeAcct('org');
        const acct2 = await makeAcct('att');
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


    it('Sanity | Organizer checks attendee FreeBusy', async () => {
        const acct1 = await makeAcct('org');
        const acct2 = await makeAcct('att');

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct2.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'F/B data should exist'
        );
    });
});
