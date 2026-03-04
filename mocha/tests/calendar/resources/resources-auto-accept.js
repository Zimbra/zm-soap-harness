import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Resources > Resources Auto Accept', function () {
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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    async function makeAcct(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
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
        const token = await soap.getAccountAuthToken(email);
        return { email, token };
    }

    async function makeResource(prefix, autoAccept, declineIfBusy) {
        const resName = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">${autoAccept}</a>
				<a n="zimbraCalResAutoDeclineIfBusy">${declineIfBusy}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const resId = Array.isArray(res.CreateCalendarResourceResponse.calresource)
            ? res.CreateCalendarResourceResponse.calresource[0].id
            : res.CreateCalendarResourceResponse.calresource.id;
        return { name: resName, id: resId };
    }


    it('Smoke | Create appointment with resource (default)', async () => {
        const acct = await makeAcct('acct');
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );

        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(90000000);
        const apptRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" cutype="RES" rsvp="1"
							a="${resName}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct.email}"/>
					</inv>
					<e a="${resName}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(apptRes.Fault, 'Create should not fault');
        assert.exists(
            apptRes.CreateAppointmentResponse.invId,
            'Invite ID should exist'
        );
    });


    it('Sanity | Resource auto-decline if busy', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const resource = await makeResource('res', 'TRUE', 'TRUE');

        const subject1 = `Subj1${common.getUniqueString()}`;
        const subject2 = `Subj2${common.getUniqueString()}`;
        const t1 = futureTime(172800000);
        const t2 = futureTime(176400000);

        // First appointment books the resource
        const appt1Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject1}">
						<at role="REQ" ptst="NE" rsvp="1" cutype="RES"
							a="${resource.name}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct2.email}"/>
					</inv>
					<e a="${resource.name}" t="t"/>
					<mp content-type="text/plain">
						<content>First booking</content>
					</mp>
					<su>${subject1}</su>
				</m>
			</CreateAppointmentRequest>`, acct2.token
        );
        assert.notExists(appt1Res.Fault, 'First appt should not fault');

        await new Promise(r => setTimeout(r, 3000));

        // Second appointment at same time should be declined
        const appt2Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject2}">
						<at role="REQ" ptst="NE" rsvp="1" cutype="RES"
							a="${resource.name}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${resource.name}" t="t"/>
					<mp content-type="text/plain">
						<content>Second booking</content>
					</mp>
					<su>${subject2}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(appt2Res.Fault, 'Second appt should not fault');
    });


    it('Sanity | Resource auto-accept all even if busy', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');
        const resource = await makeResource('res', 'TRUE', 'FALSE');

        const subject1 = `Subj1${common.getUniqueString()}`;
        const subject2 = `Subj2${common.getUniqueString()}`;
        const t1 = futureTime(259200000);
        const t2 = futureTime(262800000);

        // First appointment
        const appt1Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject1}">
						<at role="REQ" ptst="NE" rsvp="1" cutype="RES"
							a="${resource.name}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct2.email}"/>
					</inv>
					<e a="${resource.name}" t="t"/>
					<mp content-type="text/plain">
						<content>First booking</content>
					</mp>
					<su>${subject1}</su>
				</m>
			</CreateAppointmentRequest>`, acct2.token
        );
        assert.notExists(appt1Res.Fault, 'First appt should not fault');

        await new Promise(r => setTimeout(r, 3000));

        // Second appointment at same time should also be accepted
        const appt2Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject2}">
						<at role="REQ" ptst="NE" rsvp="1" cutype="RES"
							a="${resource.name}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${acct1.email}"/>
					</inv>
					<e a="${resource.name}" t="t"/>
					<mp content-type="text/plain">
						<content>Second booking</content>
					</mp>
					<su>${subject2}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(appt2Res.Fault, 'Second appt should not fault');
    });
});
