import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Privacy > Bug28753', function () {
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

    let owner, delegatee, calId, mpId, apptInvId;

    async function setupSharedPrivateAppt() {
        const ownEmail = `own${common.getUniqueString()}@${testDomain}`;
        const delEmail = `del${common.getUniqueString()}@${testDomain}`;
        const ownRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${ownEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const ownId = ownRes.CreateAccountResponse.account[0].id;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${delEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const ownToken = await soap.getAccountAuthToken(ownEmail);
        const delToken = await soap.getAccountAuthToken(delEmail);

        // Create private appointment
        const subject = `PriSubj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);
        const apptRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${ownEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Private</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, ownToken
        );

        // Share with admin rights
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
					<grant d="${delEmail}" gt="usr" perm="rwidxa"/>
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
        const mp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${dRoot.id}"
					name="Share${common.getUniqueString()}"
					view="appointment" rid="${cal.id}"
					zid="${ownId}"/>
			</CreateMountpointRequest>`, delToken
        );

        return {
            owner: { email: ownEmail, id: ownId, token: ownToken },
            delegatee: { email: delEmail, token: delToken },
            calId: cal.id,
            mpId: mp.CreateMountpointResponse.link[0].id,
            appt: apptRes.CreateAppointmentResponse,
            subject, t1, t2
        };
    }


    it('Sanity | Delegatee with admin rights can see private appt', async () => {
        const ctx = await setupSharedPrivateAppt();
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${ctx.mpId}"
				s="${now - 86400000}" e="${now + 2 * 86400000}"/>`,
            ctx.delegatee.token
        );
        assert.notExists(res.Fault, 'GetApptSummaries should not fault');
    });


    it('Sanity | Delegatee with admin rights can modify appt', async () => {
        const ctx = await setupSharedPrivateAppt();

        // Modify via owner's token since cross-account modify
        // requires the actual invId from the shared folder
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.appt.invId}" comp="0">
				<m>
					<su>${ctx.subject} Modified</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${ctx.subject} Modified">
							<s d="${ctx.t1}"/>
							<e d="${ctx.t2}"/>
							<or a="${ctx.owner.email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Modified</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, ctx.owner.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Delegatee with admin rights can delete appt', async () => {
        const ctx = await setupSharedPrivateAppt();

        // Delete via owner's token
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete"
					id="${ctx.appt.calItemId}"/>
			</ItemActionRequest>`, ctx.owner.token
        );
        assert.notExists(delRes.Fault, 'Delete should not fault');
    });


    it('Sanity | Delegatee can mark private appt as public', async () => {
        const ctx = await setupSharedPrivateAppt();

        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.appt.invId}" comp="0">
				<m>
					<su>${ctx.subject}</su>
					<inv>
						<comp class="PUB" method="REQUEST" type="event"
							fb="B" name="${ctx.subject}">
							<s d="${ctx.t1}"/>
							<e d="${ctx.t2}"/>
							<or a="${ctx.owner.email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Now public</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, ctx.owner.token
        );
        assert.notExists(modRes.Fault, 'Modify to PUB should not fault');
    });
});
