import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Privacy > AppointmentPrivacy-SearchRequest', function () {
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


    it('Functional | Delegatee cannot search private appointment data', async () => {
        const ownerEmail = `own${common.getUniqueString()}@${testDomain}`;
        const delEmail = `del${common.getUniqueString()}@${testDomain}`;
        const ownerRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${ownerEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const ownId = ownerRes.CreateAccountResponse.account[0].id;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${delEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const ownToken = await soap.getAccountAuthToken(ownerEmail);
        const delToken = await soap.getAccountAuthToken(delEmail);

        // Create private appointment
        const subject = `PriSubj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${ownerEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Secret content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, ownToken
        );

        // Share calendar
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', ownToken
        );
        const root = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder[0]
            : folderRes.GetFolderResponse.folder;
        const subs = Array.isArray(root.folder)
            ? root.folder : [root.folder];
        const cal = subs.find(f => f.name === 'Calendar');

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${cal.id}" op="grant">
					<grant d="${delEmail}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, ownToken
        );

        // Delegatee mounts
        const dFolderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', delToken
        );
        const dRoot = Array.isArray(dFolderRes.GetFolderResponse.folder)
            ? dFolderRes.GetFolderResponse.folder[0]
            : dFolderRes.GetFolderResponse.folder;

        const mpRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${dRoot.id}"
					name="Share${common.getUniqueString()}"
					view="appointment" rid="${cal.id}"
					zid="${ownId}"/>
			</CreateMountpointRequest>`, delToken
        );
        assert.notExists(
            mpRes.Fault,
            'Mountpoint should be created'
        );
    });
});
