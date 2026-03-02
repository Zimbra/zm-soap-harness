import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Create Appointment Request Recurrence Yearly', function () {
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

    it('Smoke | Create a yearly recurring appointment', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
										<count num="3"/>
										<bymonthday modaylist="1"/>
										<bymonth molist="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify recurrence
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, accountToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        assert.exists(msg.inv[0].comp[0].recur, 'Recurrence should exist');
    });


    it('Sanity | Create a yearly recurring appointment every 2 years', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="2"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(
            createRes.CreateAppointmentResponse.invId,
            'invId should exist'
        );
    });


    it('Sanity | Create a yearly recurring appointment on specific month and day', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
										<bymonth molist="6"/>
										<bymonthday modaylist="15"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(
            createRes.CreateAppointmentResponse.invId,
            'invId should exist'
        );
    });


    it('Functional | Create an appointment on 29 feb of the leap year', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Feb 29, 2024 (leap year) at noon
        const leapEpoch = 1709208000000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(leapEpoch)}"/>
							<e d="${icalTimeFromEpoch(leapEpoch + 3600000)}"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(
            createRes.CreateAppointmentResponse.invId,
            'invId should exist'
        );
    });
});
