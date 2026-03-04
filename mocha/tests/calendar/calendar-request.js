import path from 'node:path';
import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Calendar > Calendar Request', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

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
    it('Smoke | Account setup for all calendar requests smoke test', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const res1 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">"foo@foo.com"</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(res1.Fault, 'CreateAccountRequest should not fault');

        const res2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(res2.Fault, 'CreateAccountRequest should not fault');
    });


    it('Smoke | Smoke test for CreateAppointmentRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Create appointment
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // Verify response
        assert.notExists(res.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(res.CreateAppointmentResponse.invId, 'invId should exist');
    });


    it('Smoke | Smoke test for CreateAppointmentException', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const startIcal = icalTime(2 * 3600000);
        const endIcal = icalTime(3 * 3600000);

        // Create recurring appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${startIcal}"/>
						<e d="${endIcal}"/>
						<or a="${account1Email}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Create exception
        const excRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentExceptionRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="Meeting Room 1">
						<s d="${icalTime(3 * 3600000)}"/>
						<e d="${icalTime(4 * 3600000)}"/>
						<or a="${account1Email}"/>
						<exceptId d="${startIcal}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentExceptionRequest>`, account1Token
        );

        // Verify response
        assert.notExists(excRes.Fault, 'CreateAppointmentExceptionRequest should not fault');
        assert.exists(excRes.CreateAppointmentExceptionResponse.calItemId, 'calItemId should exist');
    });


    it('Smoke | Smoke test for SetAppointmentRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // SetAppointmentRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
							name="${subject}" loc="Meeting Room 1">
							<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
							<s d="${icalTime(3 * 3600000)}"/>
							<e d="${icalTime(4 * 3600000)}"/>
							<or a="${account1Email}"/>
						</inv>
						<e a="${account2Email}" t="t"/>
						<mp content-type="text/plain">
							<content>Content of the message</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1Token
        );

        // Verify response
        assert.notExists(res.Fault, 'SetAppointmentRequest should not fault');
        assert.exists(res.SetAppointmentResponse.apptId, 'apptId should exist');
    });


    it('Smoke | Smoke test for AddAppointmentInviteRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
        const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
        	? createAcctRes3.CreateAccountResponse.account[0]
        	: createAcctRes3.CreateAccountResponse.account;
        assert.exists(acctInfo3.id, 'Account ID should exist');
        const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host3, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `subject${common.getUniqueString()}`;
        const content = `.content${common.getUniqueString()}`;
        const epoch = 1417435200000;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0"
							name="${subject}">
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

        // Get UID from message
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // AddAppointmentInviteRequest
        const addRes = await soap.makeSOAPEnvelopeAccount(
            `<AddAppointmentInviteRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0"
							name="${subject}" uid="${uid}" seq="1">
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalTimeFromEpoch(epoch)}" tz="Asia/Colombo"/>
							<e d="${icalTimeFromEpoch(epoch + 3 * 3600000)}" tz="Asia/Colombo"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</AddAppointmentInviteRequest>`, account1Token
        );

        // Verify response
        assert.notExists(addRes.Fault, 'AddAppointmentInviteRequest should not fault');
        assert.exists(addRes.AddAppointmentInviteResponse.calItemId, 'calItemId should exist');
    });


    it('Smoke | Smoke test for GetFreeBusyRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        const account1Id = createRes.CreateAccountResponse.account[0].id;
        const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(4 * 3600000)}"/>
						<e d="${icalTime(5 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // GetFreeBusyRequest
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 10 * 3600000}" uid="${account1Id}"/>`,
            account1Token
        );

        // Verify response
        assert.notExists(res.Fault, 'GetFreeBusyRequest should not fault');
        assert.exists(res.GetFreeBusyResponse.usr, 'usr should exist');
    });


    it('Smoke | Smoke test for GetWorkingHoursRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        const account1Id = createRes.CreateAccountResponse.account[0].id;
        const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(5 * 3600000)}"/>
						<e d="${icalTime(6 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // GetWorkingHoursRequest
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 10 * 3600000}" id="${account1Id}"/>`,
            account1Token
        );

        // Verify response
        assert.notExists(res.Fault, 'GetWorkingHoursRequest should not fault');
        assert.exists(res.GetWorkingHoursResponse.usr, 'usr should exist');
    });


    it('Smoke | Smoke test for CancelAppointmentRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(6 * 3600000)}"/>
						<e d="${icalTime(7 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Cancel appointment
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, account1Token
        );

        // Verify response
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');
    });


    it('Smoke | Smoke test for ModifyAppointmentRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const newSubject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(7 * 3600000)}"/>
						<e d="${icalTime(8 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;
        const epoch = 1196510400000;

        // Modify appointment
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF"
						allDay="0" name="${newSubject}">
						<s d="${icalTimeFromEpoch(epoch)}"/>
						<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, account1Token
        );

        // Verify response
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        assert.exists(modRes.ModifyAppointmentResponse.invId, 'invId should exist');
    });


    it('Smoke | Smoke test for ForwardAppointmentRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const fwdSubject = `subject${common.getUniqueString()}`;
        const fwdContent = `.content${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(8 * 3600000)}"/>
						<e d="${icalTime(9 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Forward appointment
        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail" id="${invId}">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${fwdSubject}</su>
					<mp ct="text/plain">
						<content>${fwdContent}</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, account1Token
        );

        // Verify response
        assert.notExists(fwdRes.Fault, 'ForwardAppointmentRequest should not fault');
    });


    it('Smoke | Smoke test for SendInviteReplyRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment with attendee
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(10 * 3600000)}"/>
						<e d="${icalTime(11 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // Login as account2 and search for the invite with retry
        const account2Token = await soap.getAccountAuthToken(account2Email);
        let msgs;
        for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const searchRes = await soap.makeSOAPEnvelopeAccount(
                `<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2Token
            );
            if (searchRes.SearchResponse && searchRes.SearchResponse.m) {
                msgs = Array.isArray(searchRes.SearchResponse.m)
                    ? searchRes.SearchResponse.m
                    : [searchRes.SearchResponse.m];
                break;
            }
        }
        assert.exists(msgs, 'Invite message should arrive');
        const messageId = msgs[0].id;

        // Get message to find compNum
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, account2Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const m = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const compNum = m.inv[0].comp[0].compNum;

        // Send invite reply (ACCEPT)
        const replyRes = await soap.makeSOAPEnvelopeAccount(
            `<SendInviteReplyRequest xmlns="urn:zimbraMail" verb="ACCEPT"
				id="${messageId}" compNum="${compNum}" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${account1Email}"/>
					<su>ACCEPT: ${subject}</su>
					<mp ct="text/plain">
						<content>ACCEPT</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, account2Token
        );

        // Verify response
        assert.notExists(replyRes.Fault, 'SendInviteReplyRequest should not fault');
    });


    it('Smoke | Smoke test for ForwardAppointmentInviteRequest', async () => {
        // Create test accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment with attendee
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(14 * 3600000)}"/>
						<e d="${icalTime(15 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // Login as account2 and search for the invite with retry
        const account2Token = await soap.getAccountAuthToken(account2Email);
        let msgs;
        for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const searchRes = await soap.makeSOAPEnvelopeAccount(
                `<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2Token
            );
            if (searchRes.SearchResponse && searchRes.SearchResponse.m) {
                msgs = Array.isArray(searchRes.SearchResponse.m)
                    ? searchRes.SearchResponse.m
                    : [searchRes.SearchResponse.m];
                break;
            }
        }
        assert.exists(msgs, 'Invite message should exist');
        const messageId = msgs[0].id;

        // Forward the invite
        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentInviteRequest xmlns="urn:zimbraMail"
				id="${messageId}">
				<m rt="r">
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}"/>
					<su>Forward: ${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</ForwardAppointmentInviteRequest>`, account2Token
        );

        // Verify response
        assert.notExists(fwdRes.Fault, 'ForwardAppointmentInviteRequest should not fault');
    });


    it('Smoke | Smoke test for GetAppointmentRequest', async () => {
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(11 * 3600000)}"/>
						<e d="${icalTime(12 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // GetAppointmentRequest
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${invId}"/>`,
            account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
    });


    it('Functional | Sanity test for CounterAppointmentRequest and DeclineCounterAppointmentRequest', async () => {
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(12 * 3600000)}"/>
						<e d="${icalTime(13 * 3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const calItemId = createRes.CreateAppointmentResponse.calItemId;

        // Get uid and seq
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${calItemId}"/>`,
            account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = Array.isArray(getRes.GetAppointmentResponse.appt)
            ? getRes.GetAppointmentResponse.appt[0]
            : getRes.GetAppointmentResponse.appt;
        const uid = appt.inv[0].comp[0].uid;
        const seq = appt.inv[0].comp[0].seq;

        // Login as account2 and counter
        const account2Token = await soap.getAccountAuthToken(account2Email);
        const counterRes = await soap.makeSOAPEnvelopeAccount(
            `<CounterAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<e a="${account2Email}" t="t"/>
					<su>New Time Proposed: ${subject}</su>
					<mp ct="text/plain">
						<content>Lets meet some other time. uid=${uid}, seq=${seq}</content>
					</mp>
					<inv>
						<comp name="New Time Proposed: ${subject}" uid="${uid}" seq="${seq}">
							<s d="${icalTime(13 * 3600000)}"/>
							<e d="${icalTime(14 * 3600000)}"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
				</m>
			</CounterAppointmentRequest>`, account2Token
        );
        assert.notExists(counterRes.Fault, 'CounterAppointmentRequest should not fault');

        // Decline counter
        const declineRes = await soap.makeSOAPEnvelopeAccount(
            `<DeclineCounterAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<e a="${account2Email}" t="t"/>
					<su>Proposal Declined:: ${subject}</su>
					<mp ct="text/plain">
						<content>No, lets stick to the original plan.</content>
					</mp>
					<inv>
						<comp name="New Time Proposed: ${subject}" uid="${uid}" seq="${seq}">
							<s d="${icalTime(13 * 3600000)}"/>
							<e d="${icalTime(14 * 3600000)}"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
				</m>
			</DeclineCounterAppointmentRequest>`, account1Token
        );
        assert.notExists(declineRes.Fault, 'DeclineCounterAppointmentRequest should not fault');
    });


    it('Functional | Sanity test for ExpandRecurRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const epoch = 1230811200000;
        const pstEpoch = epoch - 8 * 3600000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';

        // ExpandRecurRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ExpandRecurRequest xmlns="urn:zimbraMail"
				s="${epoch + 10 * 86400000}" e="${epoch + 20 * 86400000}">
				<comp status="CONF" fb="B" transp="O" allDay="0" name="${subject}">
					<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
					<e d="${icalTimeFromEpoch(pstEpoch + 3 * 3600000)}" tz="${tz}"/>
					<or a="${accountEmail}"/>
					<recur>
						<add>
							<rule freq="DAI">
								<interval ival="1"/>
							</rule>
						</add>
					</recur>
				</comp>
			</ExpandRecurRequest>`, accountToken
        );
        assert.notExists(res.Fault, 'ExpandRecurRequest should not fault');
    });


    it('Smoke | Smoke test for GetICalRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `appt${common.getUniqueString()}`;

        // Create appointment
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(9 * 3600000)}"/>
						<e d="${icalTime(10 * 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );

        // GetICalRequest
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetICalRequest xmlns="urn:zimbraMail"
				s="${now - 2 * 86400000}" e="${now + 2 * 86400000}"/>`,
            accountToken
        );
        assert.notExists(res.Fault, 'GetICalRequest should not fault');
    });


    it('Smoke | Smoke test for GetMiniCalRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `appt${common.getUniqueString()}`;

        // Create appointment
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(2 * 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );

        // Get calendar folder ID
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // GetMiniCalRequest
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 2 * 86400000}" e="${now + 2 * 86400000}">
				<folder id="${calFolder.id}"/>
			</GetMiniCalRequest>`, accountToken
        );
        assert.notExists(res.Fault, 'GetMiniCalRequest should not fault');
    });


    it('Smoke | Smoke test for ImportAppointmentsRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // Upload ICS file
        const filePath = path.join(
            config.projectRoot, 'mocha/data/tests/basic.ics'
        );
        const aid = await soap.uploadFile(accountToken, filePath);

        // Get calendar folder ID
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // ImportAppointmentsRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ImportAppointmentsRequest xmlns="urn:zimbraMail"
				ct="ics" l="${calFolder.id}">
				<content aid="${aid}"/>
			</ImportAppointmentsRequest>`, accountToken
        );
        assert.notExists(res.Fault, 'ImportAppointmentsRequest should not fault');
    });


    it('Smoke | Smoke test for DismissCalendarItemAlarmRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create recurring appointment with alarm
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account2Email}"/>
					<inv>
						<tz id="PacificTime" stdoff="-480" dayoff="-420">
							<standard week="-1" wkday="1" mon="10" hour="2" min="0" sec="0"/>
							<daylight week="1" wkday="1" mon="4" hour="2" min="0" sec="0"/>
						</tz>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							status="CONF" class="PUB" allDay="0" name="${subject}">
							<s tz="PacificTime" d="20201019T100000"/>
							<e tz="PacificTime" d="20201019T110000"/>
							<or a="${accountEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
							<alarm action="DISPLAY">
								<trigger>
									<rel related="START" neg="1" m="30"/>
								</trigger>
								<desc>Reminder 2</desc>
								<repeat count="2" m="10"/>
							</alarm>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const apptId = createRes.CreateAppointmentResponse.calItemId;

        // Dismiss alarm
        const dismissRes = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${apptId}" dismissedAt="1603125000000"/>
			</DismissCalendarItemAlarmRequest>`, accountToken
        );
        assert.notExists(dismissRes.Fault, 'DismissCalendarItemAlarmRequest should not fault');
    });


    it('Functional | Sanity test for SendVerificationCodeRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // SendVerificationCodeRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail"
				a="${accountEmail}"/>`, accountToken
        );
        assert.notExists(res.Fault, 'SendVerificationCodeRequest should not fault');
    });


    it('Smoke | Smoke test for VerifyCodeRequest', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">"foo@foo.com"</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // Send verification code first
        await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail"
				a="${accountEmail}"/>`, accountToken
        );

        // Search for notification message
        await new Promise(resolve => setTimeout(resolve, 5000));
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>"Your device verification code"</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
        assert.exists(msgs[0], 'Verification code message should arrive');
        const fr = msgs[0].fr || '';
        const codeMatch = fr.match(/reminders is\s+(\S+)/);
        const code = codeMatch ? codeMatch[1] : '000000';

        const res = await soap.makeSOAPEnvelopeAccount(
            `<VerifyCodeRequest xmlns="urn:zimbraMail"
					a="${accountEmail}" code="${code}"/>`, accountToken
        );
        assert.notExists(res.Fault, 'VerifyCodeRequest should not fault');
    });


    it('Functional | Sanity test for InvalidateReminderDeviceRequest', async () => {
        // Create COS with reminder device enabled
        const cosName = `Cos${common.getUniqueString()}`;
        const cosRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
        );
        assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
        const cosId = cosRes.CreateCosResponse.cos[0].id;

        // Create account with COS
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${accountEmail}</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // InvalidateReminderDeviceRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<InvalidateReminderDeviceRequest xmlns="urn:zimbraMail"
				a="${accountEmail}"/>`, accountToken
        );
        assert.notExists(res.Fault, 'InvalidateReminderDeviceRequest should not fault');
    });


    it('Functional | Sanity test for FixCalendarTZRequest', async () => {
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment with custom timezone
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<tz id="My Central Timezone" stdoff="-360" dayoff="-300">
						<standard mon="10" mday="1" hour="2" min="0" sec="0"/>
						<daylight mon="3" mday="31" hour="2" min="0" sec="0"/>
					</tz>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(15 * 3600000)}" tz="My Central Timezone"/>
						<e d="${icalTime(15 * 3600000)}" tz="My Central Timezone"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );

        // FixCalendarTZRequest (admin)
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<FixCalendarTZRequest xmlns="urn:zimbraAdmin">
				<account name="${account1Email}"/>
				<tzfixup>
					<fixupRule>
						<match>
							<any/>
						</match>
						<replace>
							<tz id="America/Los_Angeles" dayoff="-420" stdoff="-480">
								<standard sec="0" min="0" hour="2" wkday="1"
									week="1" mon="11"/>
								<daylight min="0" wkday="1" sec="0" week="2"
									mon="3" hour="2"/>
							</tz>
						</replace>
					</fixupRule>
				</tzfixup>
			</FixCalendarTZRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'FixCalendarTZRequest should not fault');
    });
});
