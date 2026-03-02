import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Cancel Appointment Request Recurrence Daily', function () {
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

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Delete a single instance of a repeating event', async () => {
        // Create account
        const accountEmail = `account1.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(accRes.Fault, 'CreateAccountRequest should not fault');
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // Create recurring daily appointment (5 occurrences)
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify 5 instances via GetFreeBusy
        const inst2Start = epoch + 2 * 86400000;
        const fbRes1 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 10 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes1.Fault, 'GetFreeBusyRequest should not fault');

        // Cancel 3rd instance
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<inst d="${icalTimeFromEpoch(inst2Start)}Z"/>
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, accountToken
        );
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');

        // Verify 3rd instance is gone
        const fbRes2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 10 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes2.Fault, 'GetFreeBusyRequest should not fault');
        const usr = fbRes2.GetFreeBusyResponse.usr[0]
            || fbRes2.GetFreeBusyResponse.usr;
        const busySlots = Array.isArray(usr.b) ? usr.b : (usr.b ? [usr.b] : []);
        const inst2Found = busySlots.find(
            b => Number(b.s) === inst2Start
        );
        assert.notExists(inst2Found, 'Cancelled instance should not appear');
    });


    it('Sanity | Delete a repeating event instance with local timezone', async () => {
        // Create account
        const accountEmail = `account2.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(accRes.Fault, 'CreateAccountRequest should not fault');
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting 2 ${common.getUniqueString()}`;
        const content = `Content of the message 2 ${common.getUniqueString()}`;
        const epoch = 1196510400000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // Create recurring daily appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Cancel 3rd instance with tz
        const inst2Start = epoch + 2 * 86400000;
        const inst2PstTime = icalTimeFromEpoch(inst2Start - 8 * 3600000);
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<inst d="${inst2PstTime}" tz="${tz}"/>
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, accountToken
        );
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');

        // Verify 3rd instance is gone
        const fbRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 10 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');
        const usr = fbRes.GetFreeBusyResponse.usr[0]
            || fbRes.GetFreeBusyResponse.usr;
        const busySlots = Array.isArray(usr.b) ? usr.b : (usr.b ? [usr.b] : []);
        const inst2Found = busySlots.find(
            b => Number(b.s) === inst2Start
        );
        assert.notExists(inst2Found, 'Cancelled instance should not appear');
    });
});
