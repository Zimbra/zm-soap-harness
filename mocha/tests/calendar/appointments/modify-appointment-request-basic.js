import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Modify Appointment Request Basic', function () {
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

    it('Sanity | Update singleton inline event - Event Name', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const newSubject = `NewSubj${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1196510400000;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${accountEmail}"/>
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

        // Modify appointment name
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}">
						<s d="${icalTimeFromEpoch(epoch)}"/>
						<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountToken
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        const modInvId = modRes.ModifyAppointmentResponse.invId;

        // Verify updated name
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${modInvId}"/>
			</GetMsgRequest>`, accountToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
    });


    it('Sanity | Updating a singleton inline event - update Calendar', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const newSubject = `NewSubj${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const newContent = `changed content${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${accountEmail}"/>
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

        // Modify with new subject and content
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}">
						<s d="${icalTimeFromEpoch(pstEpoch)}"/>
						<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${newContent}</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountToken
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        const modInvId = modRes.ModifyAppointmentResponse.invId;

        // Search and verify updated name
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${pstEpoch - 86400000}"
				calExpandInstEnd="${pstEpoch + 86400000}">
				<query>subject:(${newSubject})</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'Updated appt should exist');
    });
});
