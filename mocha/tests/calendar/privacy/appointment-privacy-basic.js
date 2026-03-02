import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Privacy > Appointment-Privacy-Basic', function () {
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
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const id = res.CreateAccountResponse.account[0].id;
        const token = await soap.getAccountAuthToken(email);
        return { email, id, token };
    }

    async function createPrivateAppt(token, email, subject) {
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Private content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, token
        );
        return {
            calItemId: res.CreateAppointmentResponse.calItemId,
            invId: res.CreateAppointmentResponse.invId,
            apptId: res.CreateAppointmentResponse.apptId,
            t1, t2
        };
    }


    it('Sanity | Create a private appointment', async () => {
        const acct = await makeAcct('priv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createPrivateAppt(
            acct.token, acct.email, subject
        );
        assert.exists(
            appt.calItemId,
            'Private appointment should be created'
        );
    });


    it('Regression | Get a private appointment', async () => {
        const acct = await makeAcct('priv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createPrivateAppt(
            acct.token, acct.email, subject
        );

        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Get should not fault');
        const apptData = Array.isArray(res.GetAppointmentResponse.appt)
            ? res.GetAppointmentResponse.appt[0]
            : res.GetAppointmentResponse.appt;
        const inv = Array.isArray(apptData.inv)
            ? apptData.inv[0] : apptData.inv;
        const comp = inv.comp[0];
        assert.equal(comp.class, 'PRI', 'Class should be PRI');
    });


    it('Sanity | Modify public appointment to private', async () => {
        const acct = await makeAcct('priv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        // Create public appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PUB" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Public</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const invId = createRes.CreateAppointmentResponse.invId;
        const calItemId = createRes.CreateAppointmentResponse.calItemId;

        // Modify to private
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Now private</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');

        // Verify class is PRI
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${calItemId}"/>`, acct.token
        );
        const appt = Array.isArray(getRes.GetAppointmentResponse.appt)
            ? getRes.GetAppointmentResponse.appt[0]
            : getRes.GetAppointmentResponse.appt;
        const inv = Array.isArray(appt.inv)
            ? appt.inv[0] : appt.inv;
        assert.equal(inv.comp[0].class, 'PRI', 'Should be private');
    });


    it('Sanity | Cancel a private appointment', async () => {
        const acct = await makeAcct('priv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createPrivateAppt(
            acct.token, acct.email, subject
        );

        // Delete via ItemAction
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(delRes.Fault, 'Delete should not fault');

        // Verify no longer exists
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.exists(getRes.Fault, 'Deleted appointment should fault');
    });


    it('Sanity | Search for a private appointment', async () => {
        const acct = await makeAcct('priv');
        const subject = `Subj${common.getUniqueString()}`;
        await createPrivateAppt(acct.token, acct.email, subject);

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
        assert.exists(
            res.SearchResponse.appt,
            'Private appointment should be searchable by owner'
        );
    });


    it('Regression | Invite to private appointment', async () => {
        const acct1 = await makeAcct('org');
        const acct2 = await makeAcct('att');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<e a="${acct2.email}" t="t"/>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<at role="OPT" ptst="NE" rsvp="1"
								a="${acct2.email}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct1.email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Private invite</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(res.Fault, 'Create private with invite should not fault');
        assert.exists(
            res.CreateAppointmentResponse.calItemId,
            'Should be created'
        );
    });


    it('Sanity | Other user can see F/B status of private appt', async () => {
        const acct1 = await makeAcct('priv');
        const acct4 = await makeAcct('other');
        const subject = `Subj${common.getUniqueString()}`;
        await createPrivateAppt(acct1.token, acct1.email, subject);

        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}"
				e="${now + 2 * 86400000}"
				uid="${acct1.id}"/>`, acct4.token
        );
        assert.notExists(res.Fault, 'GetFreeBusy should not fault');
        assert.exists(
            res.GetFreeBusyResponse.usr,
            'FreeBusy data should exist'
        );
    });


    it('Sanity | Delegatee can see private appt in shared calendar', async () => {
        const owner = await makeAcct('own');
        const delegatee = await makeAcct('del');
        const subject = `Subj${common.getUniqueString()}`;
        await createPrivateAppt(owner.token, owner.email, subject);

        // Share calendar
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', owner.token
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
					<grant d="${delegatee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
        );

        // Delegatee creates mountpoint
        const dFolderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>',
            delegatee.token
        );
        const dRoot = Array.isArray(dFolderRes.GetFolderResponse.folder)
            ? dFolderRes.GetFolderResponse.folder[0]
            : dFolderRes.GetFolderResponse.folder;

        const mpRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${dRoot.id}"
					name="Share${common.getUniqueString()}"
					view="appointment" rid="${cal.id}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, delegatee.token
        );
        assert.notExists(
            mpRes.Fault,
            'Mountpoint creation should not fault'
        );
    });


    it('Sanity | Delegatee cannot modify private appointment', async () => {
        const owner = await makeAcct('own');
        const delegatee = await makeAcct('del');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createPrivateAppt(
            owner.token, owner.email, subject
        );

        // Share calendar with manager rights
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', owner.token
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
					<grant d="${delegatee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
        );

        // Delegatee creates mountpoint
        const dFolderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>',
            delegatee.token
        );
        const dRoot = Array.isArray(dFolderRes.GetFolderResponse.folder)
            ? dFolderRes.GetFolderResponse.folder[0]
            : dFolderRes.GetFolderResponse.folder;

        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${dRoot.id}"
					name="Share${common.getUniqueString()}"
					view="appointment" rid="${cal.id}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, delegatee.token
        );

        // Try to modify the private appointment from delegatee
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B"
						transp="O" status="CONF" allDay="0"
						name="${subject}">
						<s d="${appt.t1}"/>
						<e d="${appt.t2}"/>
						<or a="${owner.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Modified</content>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, delegatee.token
        );
        // Non-admin delegatee cannot modify private appt
        assert.exists(
            modRes.Fault,
            'Delegatee should not be able to modify private appt'
        );
    });


    it('Sanity | Private appointment with resource auto-accepts', async () => {
        const acct = await makeAcct('priv');
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );

        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(86400000);
        const t2 = futureTime(90000000);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<at role="REQ" ptst="NE" cutype="RES"
								rsvp="1" a="${resName}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${resName}" t="t"/>
					<mp content-type="text/plain">
						<content>Private with resource</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(
            res.Fault,
            'Create private appointment with resource should not fault'
        );
    });


    it('Sanity | Resource can accept private appointment', async () => {
        const acct = await makeAcct('priv');
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
        const t1 = futureTime(172800000);
        const t2 = futureTime(176400000);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject}</su>
					<inv>
						<comp class="PRI" method="REQUEST" type="event"
							fb="B" name="${subject}">
							<at role="REQ" ptst="NE" cutype="RES"
								rsvp="1" a="${resName}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${resName}" t="t"/>
					<mp content-type="text/plain">
						<content>Private with resource</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Create should not fault');
        assert.exists(
            res.CreateAppointmentResponse.calItemId,
            'CalItemId should exist'
        );
    });
});
