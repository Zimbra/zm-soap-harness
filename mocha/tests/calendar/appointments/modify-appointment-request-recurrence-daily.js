import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Modify Appointment Request Recurrence Daily', function () {
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

    it('Sanity | Modify daily recurring event - add reminder and change start time', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1196510400000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // Create daily recurring appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Modify: add alarm
        const mod1Res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${icalTimeFromEpoch(epoch)}" tz="${tz}"/>
						<e d="${icalTimeFromEpoch(epoch + 3600000)}" tz="${tz}"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" m="30"/>
							</trigger>
							<desc>Reminder 1</desc>
						</alarm>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountToken
        );
        assert.notExists(mod1Res.Fault, 'First ModifyAppointment should not fault');
        const mod1InvId = mod1Res.ModifyAppointmentResponse.invId;

        // Modify again: change start time
        const mod2Res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${mod1InvId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<s d="${icalTimeFromEpoch(epoch + 1800000)}" tz="${tz}"/>
						<e d="${icalTimeFromEpoch(epoch + 3600000)}" tz="${tz}"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" m="30"/>
							</trigger>
							<desc>Reminder 1</desc>
						</alarm>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountToken
        );
        assert.notExists(mod2Res.Fault, 'Second ModifyAppointment should not fault');
        const mod2InvId = mod2Res.ModifyAppointmentResponse.invId;

        // Verify via GetAppointment
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${mod2InvId}"/>`, accountToken
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getRes.GetAppointmentResponse.appt[0]
            || getRes.GetAppointmentResponse.appt;
        const comp = appt.inv[0].comp[0];
        assert.equal(comp.name, subject, 'Name should match');
        assert.exists(comp.alarm, 'Alarm should exist');
    });
});
