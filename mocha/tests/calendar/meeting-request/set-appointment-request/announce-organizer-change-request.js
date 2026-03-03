import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Set Appointment Request > Announce Organizer Change Request', function () {
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
    it('Deprecated | Create a basic meeting request using SetAppointmentRequest', async () => {
        // Create 3 accounts
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

        const acct3Email = `acct3${common.getUniqueString()}@${testDomain}`;
        const acct3Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct3Res.Fault, 'CreateAccountRequest should not fault');

        // Create appointment using SetAppointmentRequest with account1 as organizer
        const subject = `Subj${common.getUniqueString()}`;
        const uid = common.getUniqueString();
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const setApptRes = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv uid="${uid}" allDay="0" name="${subject}"
							seq="0" class="PUB" method="REQUEST"
							transp="O" fb="B">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct1Email}"/>
							<at a="${acct3Email}" rsvp="1" role="REQ"
								ptst="NE"/>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>Content</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct1Token
        );
        assert.notExists(setApptRes.Fault, 'SetAppointmentRequest should not fault');
        const apptId = setApptRes.SetAppointmentResponse.apptId;
        assert.exists(apptId, 'ApptId should exist');

        // Verify organizer is account1
        const getApptRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptId}"/>`, acct1Token
        );
        assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');

        // Change organizer to account2 using SetAppointmentRequest
        const setApptRes2 = await soap.makeSOAPEnvelopeAccount(
            `<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv uid="${uid}" allDay="0" name="${subject}"
							seq="0" class="PUB" method="REQUEST"
							transp="O" fb="B">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct2Email}"/>
							<at a="${acct3Email}" rsvp="1" role="REQ"
								ptst="NE"/>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>Content</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct1Token
        );
        assert.notExists(setApptRes2.Fault, 'SetAppointmentRequest should not fault');
        const apptId2 = setApptRes2.SetAppointmentResponse.apptId;
        assert.exists(apptId2, 'ApptId2 should exist');

        // Announce organizer change
        const announceRes = await soap.makeSOAPEnvelopeAccount(
            `<AnnounceOrganizerChangeRequest xmlns="urn:zimbraMail"
				id="${apptId2}"/>`, acct1Token
        );
        assert.notExists(announceRes.Fault, 'AnnounceOrganizerChangeRequest should not fault');

        // Verify organizer is now account2
        const getApptRes2 = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptId2}"/>`, acct1Token
        );
        assert.notExists(getApptRes2.Fault, 'GetAppointmentRequest should not fault');
    });
});
