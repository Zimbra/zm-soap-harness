import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Resources > Resources Create Appointment', function () {
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


    it('Sanity | Create appointment with a resource', async () => {
        // Create account
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const token = await soap.getAccountAuthToken(email);

        // Create resource
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );

        // Create appointment with resource
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        const apptRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" cutype="RES" rsvp="1"
							a="${resName}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${email}"/>
					</inv>
					<e a="${resName}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
        assert.notExists(apptRes.Fault, 'Create should not fault');
        const invId = apptRes.CreateAppointmentResponse.invId;

        // Verify resource is attendee
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}"/>`, token
        );
        assert.notExists(getRes.Fault, 'Get should not fault');
        const appt = Array.isArray(getRes.GetAppointmentResponse.appt)
            ? getRes.GetAppointmentResponse.appt[0]
            : getRes.GetAppointmentResponse.appt;
        const inv = Array.isArray(appt.inv) ? appt.inv[0] : appt.inv;
        const comp = inv.comp[0];
        const attendees = Array.isArray(comp.at)
            ? comp.at
            : [comp.at];
        const resAt = attendees.find(a => a.a === resName || a.url === resName);
        assert.exists(resAt, 'Resource should be in attendees');
    });
});
