import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Forward Appointment Invite Request Basic', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTimeFromEpoch(epochMs) {
        const d = new Date(epochMs);
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

    it('Smoke | Forward an appointment invite to another user', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attEmail = `att${common.getUniqueString()}@${testDomain}`;
        const fwdEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, attEmail, fwdEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const attToken = await soap.getAccountAuthToken(attEmail);
        const subject = `Subject${common.getUniqueString()}`;
        const epoch = 1514808000000;

        // Create appointment
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
							<at a="${attEmail}" role="REQ" ptst="NE" rsvp="1"/>
						</comp>
					</inv>
					<e a="${attEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );

        // Wait for invite
        await new Promise(r => setTimeout(r, 2000));
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, attToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        if (!searchRes.SearchResponse.m) return;
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        // Forward invite
        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="${msgs[0].id}">
				<m>
					<e a="${fwdEmail}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Please check this</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, attToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Sanity | Forward appointment invite with custom message', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attEmail = `att${common.getUniqueString()}@${testDomain}`;
        const fwdEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, attEmail, fwdEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const attToken = await soap.getAccountAuthToken(attEmail);
        const subject = `Meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
							<at a="${attEmail}" role="REQ" ptst="NE" rsvp="1"/>
						</comp>
					</inv>
					<e a="${attEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );

        await new Promise(r => setTimeout(r, 2000));
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, attToken
        );
        if (!searchRes.SearchResponse.m) return;
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="${msgs[0].id}">
				<m>
					<e a="${fwdEmail}" t="t"/>
					<su>Custom: ${subject}</su>
					<mp content-type="text/plain">
						<content>Custom forward message body</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, attToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Sanity | Forward appointment invite to multiple recipients', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attEmail = `att${common.getUniqueString()}@${testDomain}`;
        const fwd1Email = `fwd1${common.getUniqueString()}@${testDomain}`;
        const fwd2Email = `fwd2${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, attEmail, fwd1Email, fwd2Email]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const attToken = await soap.getAccountAuthToken(attEmail);
        const subject = `MultiForward${common.getUniqueString()}`;
        const epoch = 1514808000000;

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
							<at a="${attEmail}" role="REQ" ptst="NE" rsvp="1"/>
						</comp>
					</inv>
					<e a="${attEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );

        await new Promise(r => setTimeout(r, 2000));
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, attToken
        );
        if (!searchRes.SearchResponse.m) return;
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="${msgs[0].id}">
				<m>
					<e a="${fwd1Email}" t="t"/>
					<e a="${fwd2Email}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Forwarding to multiple</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, attToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Regression | Forward invite with invalid message id', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="999999">
				<m>
					<e a="${accountEmail}" t="t"/>
					<su>Fwd: invalid</su>
					<mp content-type="text/plain">
						<content>Invalid forward</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, accountToken
        );
        assert.isString(fwdRes.Fault.Detail.Error.Code, 'Should fault with invalid id');
    });
});
