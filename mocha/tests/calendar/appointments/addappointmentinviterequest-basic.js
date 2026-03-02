import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > AddAppointmentInviteRequest-Basic', function () {
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
    it('Smoke | Update an existing appointment using AddAppointmentInviteRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
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
        const subject = `subject${common.getUniqueString()}`;
        const content = `.content${common.getUniqueString()}`;
        const epoch = 1417435200000;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(epoch)}" tz="Asia/Colombo"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}" tz="Asia/Colombo"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<e a="${account2Email}" t="t"/>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get UID
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // AddAppointmentInviteRequest - expect INVALID_REQUEST (bug 74400)
        const addRes = await soap.makeSOAPEnvelopeAccount(
            `<AddAppointmentInviteRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}" uid="${uid}" seq="1">
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(epoch)}" tz="Asia/Colombo"/>
							<e d="${icalTimeFromEpoch(epoch + 3 * 3600000)}"
								tz="Asia/Colombo"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</AddAppointmentInviteRequest>`, account1Token
        );

        // Verify service.INVALID_REQUEST fault
        assert.exists(addRes.Fault, 'AddAppointmentInviteRequest should fault');
        const faultCode = addRes.Fault.Detail?.Error?.Code
            || addRes.Fault.Code?.Value || '';
        assert.match(
            faultCode,
            /service\.INVALID_REQUEST|soap:Sender/,
            'Error should indicate invalid request'
        );
    });


    it('Sanity | Create new appointment using AddAppointmentInviteRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
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
        const subject = `subject${common.getUniqueString()}`;
        const content = `.content${common.getUniqueString()}`;
        const epoch = 1401624000000;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(epoch)}" tz="Asia/Colombo"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}" tz="Asia/Colombo"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<e a="${account2Email}" t="t"/>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get UID
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // AddAppointmentInviteRequest with different UID
        const newUID = '123456-123456-123456';
        const addRes = await soap.makeSOAPEnvelopeAccount(
            `<AddAppointmentInviteRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}" uid="${newUID}">
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(epoch)}" tz="Asia/Colombo"/>
							<e d="${icalTimeFromEpoch(epoch + 3 * 3600000)}"
								tz="Asia/Colombo"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</AddAppointmentInviteRequest>`, account1Token
        );
        assert.notExists(addRes.Fault, 'AddAppointmentInviteRequest should not fault');
        assert.exists(
            addRes.AddAppointmentInviteResponse.calItemId,
            'calItemId should exist'
        );

        // Verify original appointment unchanged
        const verifyRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
        const verMsg = Array.isArray(verifyRes.GetMsgResponse.m)
            ? verifyRes.GetMsgResponse.m[0] : verifyRes.GetMsgResponse.m;
        assert.equal(verMsg.inv[0].comp[0].uid, uid, 'Original UID should be unchanged');

        // Verify new appointment created
        const newCalItemId = addRes.AddAppointmentInviteResponse.calItemId;
        const getApptRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${newCalItemId}"/>`, account1Token
        );
        assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getApptRes.GetAppointmentResponse.appt[0]
            || getApptRes.GetAppointmentResponse.appt;
        assert.equal(appt.inv[0].comp[0].uid, newUID, 'New UID should match');
    });


    it('Sanity | Update an existing recurring appointment using AddAppointmentInviteRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
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
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1575201600000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // Create recurring appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${account1Email}"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
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
					<e a="${account2Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get UID
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // AddAppointmentInviteRequest to update recurring appointment
        const addRes = await soap.makeSOAPEnvelopeAccount(
            `<AddAppointmentInviteRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}" uid="${uid}" seq="1">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 4 * 3600000)}"
								tz="${tz}"/>
							<or a="${account1Email}"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${account2Email}" t="t"/>
					<e a="${account3Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</AddAppointmentInviteRequest>`, account1Token
        );
        assert.notExists(addRes.Fault, 'AddAppointmentInviteRequest should not fault');
        assert.exists(
            addRes.AddAppointmentInviteResponse.calItemId,
            'calItemId should exist'
        );

        // Verify updated appointment
        const verifyRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
        const verMsg = Array.isArray(verifyRes.GetMsgResponse.m)
            ? verifyRes.GetMsgResponse.m[0] : verifyRes.GetMsgResponse.m;
        assert.equal(verMsg.inv[0].comp[0].uid, uid, 'UID should remain same');
    });


    it('Sanity | Create new recurring appointment using AddAppointmentInviteRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
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
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1512129600000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // Create recurring appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}"
								tz="${tz}"/>
							<or a="${account1Email}"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
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
					<e a="${account2Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get UID
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // AddAppointmentInviteRequest with different UID to create new
        const newUID = '95123456-85123456-45123456';
        const addRes = await soap.makeSOAPEnvelopeAccount(
            `<AddAppointmentInviteRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}" uid="${newUID}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 4 * 3600000)}"
								tz="${tz}"/>
							<or a="${account1Email}"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${account2Email}" t="t"/>
					<e a="${account3Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</AddAppointmentInviteRequest>`, account1Token
        );
        assert.notExists(addRes.Fault, 'AddAppointmentInviteRequest should not fault');
        const newCalItemId = addRes.AddAppointmentInviteResponse.calItemId;

        // Verify new appointment created with new UID
        const getApptRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${newCalItemId}"/>`, account1Token
        );
        assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getApptRes.GetAppointmentResponse.appt[0]
            || getApptRes.GetAppointmentResponse.appt;
        assert.equal(appt.inv[0].comp[0].uid, newUID, 'New UID should match');

        // Verify original appointment unchanged
        const verifyRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
        const verMsg = Array.isArray(verifyRes.GetMsgResponse.m)
            ? verifyRes.GetMsgResponse.m[0] : verifyRes.GetMsgResponse.m;
        assert.equal(verMsg.inv[0].comp[0].uid, uid, 'Original UID unchanged');
    });
});
