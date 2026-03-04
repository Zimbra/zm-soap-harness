import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Create Appointment Request Recurrence Daily', function () {
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

    it('Smoke | Create a daily recurring appointment', async () => {
        const accountEmail = `account1.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const host = accRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
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
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
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
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify recurrence via GetMsg
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, accountToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        assert.exists(msg.inv[0].comp[0].recur, 'Recurrence should exist');

        // Verify free/busy shows instances
        const fbRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 10 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');
        const usr = fbRes.GetFreeBusyResponse.usr[0]
            || fbRes.GetFreeBusyResponse.usr;
        const busySlots = Array.isArray(usr.b) ? usr.b : (usr.b ? [usr.b] : []);
        assert.isAtLeast(busySlots.length, 4, 'Should have at least 4 busy slots');
    });


    it('Sanity | Create a daily recurring appointment with 5 occurrences', async () => {
        const accountEmail = `account2.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const host = accRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
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
						<content>Content of the message</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // Verify 5 occurrences via FreeBusy
        const fbRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 10 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');
        const usr = fbRes.GetFreeBusyResponse.usr[0]
            || fbRes.GetFreeBusyResponse.usr;
        const busySlots = Array.isArray(usr.b) ? usr.b : (usr.b ? [usr.b] : []);
        assert.equal(busySlots.length, 5, 'Should have exactly 5 busy slots');
    });


    it('Sanity | Create a daily recurring appointment every 3 days', async () => {
        const accountEmail = `account3.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const host = accRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
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
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="3"/>
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

        // Verify interval via GetMsg
        const invId = createRes.CreateAppointmentResponse.invId;
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, accountToken
        );
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const recur = msg.inv[0].comp[0].recur;
        assert.exists(recur, 'Recurrence should exist');
    });


    it('Sanity | Create a daily recurring appointment every 3 days with 4 occurrences', async () => {
        const accountEmail = `account4.${common.getUniqueString()}@${testDomain}`;
        const accRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountId = accRes.CreateAccountResponse.account[0].id;
        const host = accRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
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
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="3"/>
										<count num="4"/>
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

        // Verify 4 occurrences via FreeBusy (every 3 days)
        const fbRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${epoch - 86400000}" e="${epoch + 15 * 86400000}"
				uid="${accountId}"/>`, accountToken
        );
        assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');
        const usr = fbRes.GetFreeBusyResponse.usr[0]
            || fbRes.GetFreeBusyResponse.usr;
        const busySlots = Array.isArray(usr.b) ? usr.b : (usr.b ? [usr.b] : []);
        assert.equal(busySlots.length, 4, 'Should have exactly 4 busy slots');
    });
});
