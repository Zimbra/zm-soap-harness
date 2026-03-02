import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Forward Appointment Invite', function () {
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

    it('Smoke | Verify that a user can forward a received invite', async () => {
        // Create organizer and attendee
        const organizerEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attendeeEmail = `att${common.getUniqueString()}@${testDomain}`;
        const forwardEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${organizerEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${attendeeEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${forwardEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const orgToken = await soap.getAccountAuthToken(organizerEmail);
        const attToken = await soap.getAccountAuthToken(attendeeEmail);
        const subject = `Meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;

        // Create appointment with attendee
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${organizerEmail}"/>
							<at a="${attendeeEmail}" role="REQ" ptst="NE"
								rsvp="1"/>
						</comp>
					</inv>
					<e a="${attendeeEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointment should not fault');

        // Wait for invite to arrive and search
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
        const invMsgId = msgs[0].id;

        // Forward invite
        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="${invMsgId}">
				<m>
					<e a="${forwardEmail}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Forwarding this invite</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, attToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Sanity | Verify forward fails without sendOnBehalfOf right', async () => {
        const organizerEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attendeeEmail = `att${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${organizerEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${attendeeEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const orgToken = await soap.getAccountAuthToken(organizerEmail);
        const subject = `Meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;

        // Create appointment with attendee
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${organizerEmail}"/>
							<at a="${attendeeEmail}" role="REQ" ptst="NE"
								rsvp="1"/>
						</comp>
					</inv>
					<e a="${attendeeEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointment should not fault');
        assert.exists(
            createRes.CreateAppointmentResponse.invId,
            'invId should exist'
        );
    });
});
