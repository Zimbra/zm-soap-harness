import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Set Appointment Request > Set Appointment Request Basic', function () {
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

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests

    it('Smoke | Create a basic meeting request using SetAppointmentRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Set appointment
        const subject = `subject${common.getUniqueString()}`;
        const content = `content${common.getUniqueString()}`;
        const location = `location${common.getUniqueString()}`;
        const uid = `${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';
        const setRes = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv uid="${uid}" allDay="0" name="${subject}"
							seq="0" class="PUB" loc="${location}"
							method="REQUEST" transp="O" fb="B">
							<s d="${t1}" tz="${tz}"/>
							<e d="${t2}" tz="${tz}"/>
							<or a="${account1Email}"/>
							<at a="${account3Email}" rsvp="1"
								role="REQ" ptst="NE"/>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>${content}</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, account1Token
        );
        assert.notExists(setRes.Fault, 'SetAppointmentRequest should not fault');
        const apptId = setRes.SetAppointmentResponse.apptId;

        // Get appointment and verify
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptId}"/>`, account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getRes.GetAppointmentResponse.appt[0];
        const comp = appt.inv[0].comp[0];
        assert.equal(comp.name, subject, 'Subject should match');
        assert.equal(comp.loc, location, 'Location should match');

        // Search for the appointment
        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 4 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, account1Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const searchAppt = searchRes.SearchResponse.appt;
        const apptArr = Array.isArray(searchAppt) ? searchAppt : [searchAppt];
        assert.equal(apptArr[0].dur, '3600000', 'Duration should be 1 hour');
    });
});
