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
    it('Smoke | Update a singleton event - add an alias', async () => {
        // Create accounts
        const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
        const acct1Token = await soap.getAccountAuthToken(acct1Email);

        const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
        const acct2Id = acct2Res.CreateAccountResponse.account[0].id;
        const host = acct2Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const acct2Token = await soap.getAccountAuthToken(acct2Email);

        // Add alias to account2
        const aliasEmail = `alias${common.getUniqueString()}@${testDomain}`;
        const aliasRes = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2Id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
        );
        assert.notExists(aliasRes.Fault, 'AddAccountAliasRequest should not fault');

        // Create a simple appointment (no invitees)
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct1Email}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;
        assert.exists(invId, 'Appointment invId should exist');

        // Get compNum
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const compNum = msg.inv[0].comp[0].compNum || 0;

        // Modify appointment to add alias as attendee
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="${compNum}">
				<m>
					<inv method="REQUEST" type="event" fb="B"
						transp="O" status="CONF" allDay="0"
						name="${subject}">
						<or a="${acct1Email}"/>
						<at a="${aliasEmail}" role="REQ"
							ptst="NE" rsvp="1"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<e a="${aliasEmail}" t="t"/>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1Token
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        assert.exists(modRes.ModifyAppointmentResponse.invId, 'ModifyAppointmentResponse invId should exist');

        // Verify noBlob on organizer after modify
        const getMsg2Res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct1Token
        );
        assert.notExists(getMsg2Res.Fault, 'GetMsgRequest should not fault');
        const msg2 = Array.isArray(getMsg2Res.GetMsgResponse.m)
            ? getMsg2Res.GetMsgResponse.m[0] : getMsg2Res.GetMsgResponse.m;
        assert.isOk(msg2.inv[0].comp[0].noBlob, 'noBlob should be truthy');

        // Verify account2 sees the appointment
        const now = Date.now();
        const searchRes = await soap.pollForSearchResult(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>subject:(${subject}) is:anywhere</query>
			</SearchRequest>`, acct2Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const appts = Array.isArray(searchRes.SearchResponse.appt)
            ? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
        assert.isAtLeast(appts.length, 1, 'Account 2 should see the appointment');

        // Verify noBlob on invitee
        const acct2InvId = appts[0].invId;
        const getMsg3Res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${acct2InvId}"/>
			</GetMsgRequest>`, acct2Token
        );
        assert.notExists(getMsg3Res.Fault, 'GetMsgRequest should not fault');
        const msg3 = Array.isArray(getMsg3Res.GetMsgResponse.m)
            ? getMsg3Res.GetMsgResponse.m[0] : getMsg3Res.GetMsgResponse.m;
        assert.isOk(msg3.inv[0].comp[0].noBlob, 'noBlob should be truthy on invitee');
    });


    it('Sanity | Update a singleton event - add an alias and remove email address', async () => {
        // Create accounts
        const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
        const acct1Token = await soap.getAccountAuthToken(acct1Email);

        const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
        const acct2Id = acct2Res.CreateAccountResponse.account[0].id;
        const host = acct2Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const acct2Token = await soap.getAccountAuthToken(acct2Email);

        // Add alias to account2
        const aliasEmail = `alias${common.getUniqueString()}@${testDomain}`;
        const aliasRes = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2Id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
        );
        assert.notExists(aliasRes.Fault, 'AddAccountAliasRequest should not fault');

        // Create appointment with account2 as attendee (using primary email)
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct1Email}"/>
							<at a="${acct2Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${acct2Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;
        assert.exists(invId, 'Appointment invId should exist');

        // Get compNum
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const compNum = msg.inv[0].comp[0].compNum || 0;

        // Account2 accepts
        const now = Date.now();
        const searchRes = await soap.pollForSearchResult(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, acct2Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const acct2Appts = Array.isArray(searchRes.SearchResponse.appt)
            ? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
        const acct2InvId = acct2Appts[0].invId;

        const getAcct2Msg = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${acct2InvId}"/>
			</GetMsgRequest>`, acct2Token
        );
        assert.notExists(getAcct2Msg.Fault, 'GetMsgRequest should not fault');
        const acct2Msg = Array.isArray(getAcct2Msg.GetMsgResponse.m)
            ? getAcct2Msg.GetMsgResponse.m[0] : getAcct2Msg.GetMsgResponse.m;
        const acct2CompNum = acct2Msg.inv[0].comp[0].compNum || 0;

        const replyRes = await soap.makeSOAPEnvelopeAccount(
            `<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="ACCEPT" id="${acct2InvId}"
				compNum="${acct2CompNum}" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${acct1Email}"/>
					<su>ACCEPT: ${subject}</su>
					<mp ct="text/plain">
						<content>ACCEPT: ${subject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2Token
        );
        assert.notExists(replyRes.Fault, 'SendInviteReplyRequest should not fault');

        // Re-search to get updated invId
        const searchRes2 = await soap.pollForSearchResult(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>subject:(${subject}) is:anywhere</query>
			</SearchRequest>`, acct1Token
        );
        assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
        const acct1Appts = Array.isArray(searchRes2.SearchResponse.appt)
            ? searchRes2.SearchResponse.appt : [searchRes2.SearchResponse.appt];
        const updatedInvId = acct1Appts[0].invId;

        // Get updated compNum
        const getMsg2Res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${updatedInvId}"/>
			</GetMsgRequest>`, acct1Token
        );
        assert.notExists(getMsg2Res.Fault, 'GetMsgRequest should not fault');
        const msg2 = Array.isArray(getMsg2Res.GetMsgResponse.m)
            ? getMsg2Res.GetMsgResponse.m[0] : getMsg2Res.GetMsgResponse.m;
        const compNum2 = msg2.inv[0].comp[0].compNum || 0;

        // Modify appointment - replace primary email with alias
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${updatedInvId}" comp="${compNum2}">
				<m>
					<inv method="REQUEST" type="event" fb="B"
						transp="O" status="CONF" allDay="0"
						name="${subject}">
						<or a="${acct1Email}"/>
						<at a="${aliasEmail}" role="REQ"
							ptst="NE" rsvp="1"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<e a="${aliasEmail}" t="t"/>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, acct1Token
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        assert.exists(modRes.ModifyAppointmentResponse.invId, 'ModifyAppointmentResponse invId should exist');

        // Verify account2 still sees the appointment via alias
        const searchRes3 = await soap.pollForSearchResult(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, acct2Token
        );
        assert.notExists(searchRes3.Fault, 'SearchRequest should not fault');
        const finalAppts = Array.isArray(searchRes3.SearchResponse.appt)
            ? searchRes3.SearchResponse.appt : [searchRes3.SearchResponse.appt];
        assert.isAtLeast(finalAppts.length, 1, 'Account 2 should still see appointment via alias');
    });
});
