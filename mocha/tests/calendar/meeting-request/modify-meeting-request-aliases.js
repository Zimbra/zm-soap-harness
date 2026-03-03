import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Modify Meeting Request Aliases', function () {
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

    it('Smoke | Update a singleton event - add an alias', async () => {
        // Create accounts
        const account1Email = `account1${common.getUniqueString()}@${testDomain}`;
        const account2Email = `account2${common.getUniqueString()}@${testDomain}`;
        const account2Alias = `account2alias${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account2Id = acct2Res.CreateAccountResponse.account[0].id;

        // Add alias to account2
        await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${account2Alias}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
        );

        // Get auth tokens
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Create appointment
        const subject = `Subject${common.getUniqueString()}`;
        const content = `Content${common.getUniqueString()}`;
        const epoch = 1546344000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${account1Email}"/>
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}" tz="${tz}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get compNum
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const compNum = msg.inv[0].comp[0].compNum || 0;

        // Modify appointment - add alias as attendee
        const modifyRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="${compNum}">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<or a="${account1Email}"/>
						<at a="${account2Alias}" role="REQ" ptst="NE" rsvp="1"/>
						<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
						<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}" tz="${tz}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<e a="${account2Alias}" t="t"/>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, account1Token
        );
        assert.notExists(modifyRes.Fault, 'ModifyAppointmentRequest should not fault');

        // Verify modified appointment
        const verifyRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
    });


    it('Sanity | Update a singleton event - add an alias and remove email address', async () => {
        // Create accounts
        const account1Email = `account1${common.getUniqueString()}@${testDomain}`;
        const account2Email = `account2${common.getUniqueString()}@${testDomain}`;
        const account2Alias = `account2alias${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account2Id = acct2Res.CreateAccountResponse.account[0].id;

        // Add alias to account2
        await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${account2Alias}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
        );

        // Get auth tokens
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Create appointment with account2 email as attendee
        const subject = `Subject${common.getUniqueString()}`;
        const content = `Content${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${account1Email}"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}" tz="${tz}"/>
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

        // Get compNum
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const compNum = msg.inv[0].comp[0].compNum || 0;

        // Modify appointment - replace account2 email with alias
        const modifyRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="${compNum}">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}">
						<or a="${account1Email}"/>
						<at a="${account2Alias}" role="REQ" ptst="NE" rsvp="1"/>
						<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
						<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}" tz="${tz}"/>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<e a="${account2Alias}" t="t"/>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, account1Token
        );
        assert.notExists(modifyRes.Fault, 'ModifyAppointmentRequest should not fault');

        // Verify modified appointment on account1
        const verifyRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
    });
});
