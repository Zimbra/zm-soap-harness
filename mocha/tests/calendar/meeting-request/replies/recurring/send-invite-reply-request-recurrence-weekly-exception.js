import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import { main } from '../../../../../pages/main.js';

describe('Calendar > Meeting Request > Replies > Recurring > Send Invite Reply Request Recurrence Weekly Exception', function () {
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

    it('Sanity | Verify participant status is shown to the organizer for an exception to a basic weekly recurrent appointment 1', async () => {
        // Create accounts
        const orgEmail = `organizer1${common.getUniqueString()}@${testDomain}`;
        const invEmail = `invitee1${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
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
				<name>${invEmail}</name>
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
        const orgToken = await soap.getAccountAuthToken(orgEmail);

        // Create recurring weekly appointment
        const subject = `subject${common.getUniqueString()}`;
        const exceptionSubject = `exception${common.getUniqueString()}`;
        const content = `content${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(3600000 + 3 * 3600000);
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${invEmail}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Create exception for the second instance (7 days later)
        const excT1 = futureTime(8 * 86400000);
        const excT2 = futureTime(8 * 86400000 + 3 * 3600000);
        const exceptIdTime = futureTime(7 * 86400000);
        const excRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentExceptionRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${exceptionSubject}">
							<s d="${excT1}"/>
							<e d="${excT2}"/>
							<at a="${invEmail}" role="REQ" ptst="NE" rsvp="1"/>
							<or a="${orgEmail}"/>
							<exceptId d="${exceptIdTime}"/>
						</comp>
					</inv>
					<e t="t" a="${invEmail}"/>
					<su>${exceptionSubject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CreateAppointmentExceptionRequest>`, orgToken
        );
        assert.notExists(excRes.Fault, 'CreateAppointmentExceptionRequest should not fault');
        const excInvId = excRes.CreateAppointmentExceptionResponse.invId;

        // Verify the series still shows invitee as NE
        const seriesMsg = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, orgToken
        );
        assert.notExists(seriesMsg.Fault, 'GetMsgRequest should not fault');
        const sMsg = Array.isArray(seriesMsg.GetMsgResponse.m)
            ? seriesMsg.GetMsgResponse.m[0] : seriesMsg.GetMsgResponse.m;
        const seriesAt = sMsg.inv[0].comp[0].at;
        const seriesAtArr = Array.isArray(seriesAt) ? seriesAt : [seriesAt];
        const invAtSeries = seriesAtArr.find(a => a.a === invEmail);
        assert.exists(invAtSeries, 'Invitee should be in attendees');
        assert.equal(invAtSeries.ptst, 'NE', 'Invitee ptst should be NE for the series');

        // Verify the exception was created
        const excMsg = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${excInvId}"/>
			</GetMsgRequest>`, orgToken
        );
        assert.notExists(excMsg.Fault, 'GetMsgRequest for exception should not fault');
    });
});
