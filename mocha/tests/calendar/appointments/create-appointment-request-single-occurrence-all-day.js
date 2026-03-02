import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Create Appointment Request Single Occurrence All Day', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

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

    it('Smoke | Create an all day appointment', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `AllDay${common.getUniqueString()}`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="F" transp="O"
							allDay="1" name="${subject}">
							<s d="20180101"/>
							<e d="20180101"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'Should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify all day flag
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, accountToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        assert.isOk(msg.inv[0].comp[0].allDay, 'allDay should be truthy');
    });


    it('Sanity | Create an all day appointment and verify data on server', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `AllDay${common.getUniqueString()}`;
        const epoch = 1514764800000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="F" transp="O"
							allDay="1" name="${subject}">
							<s d="20180101"/>
							<e d="20180102"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'Should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Search for the appointment
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${epoch - 86400000}"
				calExpandInstEnd="${epoch + 3 * 86400000}">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'All-day appt found');
    });
});
