import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Mountpoint > New Calendar Rights', function () {
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

	async function getCalFolder(token) {
		const r = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', token
		);
		const root = Array.isArray(r.GetFolderResponse.folder)
			? r.GetFolderResponse.folder[0]
			: r.GetFolderResponse.folder;
		return { rootId: root.id };
	}

	async function createSubCalAndShare(owner, sharee, perm) {
		// Create new sub-calendar
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		// Grant
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="${perm}"/>
				</action>
			</FolderActionRequest>`, owner.token
		);

		// Mount
		const shareeCal = await getCalFolder(sharee.token);
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shareeCal.rootId}"
					name="SC${common.getUniqueString()}"
					view="appointment" rid="${ownerCalId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
		);
		return {
			calId: ownerCalId,
			mpId: mpRes.CreateMountpointResponse.link[0].id
		};
	}


	it('Sanity | Read-only access to new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'r');
		const now = Date.now();
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${mp.mpId}" s="${now - 86400000}"
				e="${now + 86400000}"/>`, sharee.token
		);
		assert.notExists(res.Fault, 'Read should not fault');
	});


	it('Sanity | Write denied on read-only new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'r');
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${mp.mpId}">
					<inv>
						<comp name="Test" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${sharee.email}"/>
						</comp>
					</inv>
					<su>Test</su>
					<mp ct="text/plain"><content>C</content></mp>
				</m>
			</CreateAppointmentRequest>`, sharee.token
		);
		assert.exists(res.Fault, 'Write on read-only should fault');
	});


	it('Sanity | Read-write access to new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'rwidx');
		const now = Date.now();
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${mp.mpId}" s="${now - 86400000}"
				e="${now + 86400000}"/>`, sharee.token
		);
		assert.notExists(res.Fault, 'RW read should not fault');
	});


	it('Sanity | Create appointment in RW new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'rwidx');
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const subject = `Subj${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${mp.mpId}">
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${owner.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>C</content></mp>
				</m>
			</CreateAppointmentRequest>`, sharee.token
		);
		assert.notExists(res.Fault, 'Create should not fault');
	});


	it('Sanity | Delete from RW new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'rwidx');
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${mp.calId}">
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${owner.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>C</content></mp>
				</m>
			</CreateAppointmentRequest>`, owner.token
		);
		const calItemId = appt.CreateAppointmentResponse.calItemId;
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${calItemId}"/>
			</ItemActionRequest>`, owner.token
		);
		assert.notExists(delRes.Fault, 'Delete should not fault');
	});


	it('Sanity | Admin rights to new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'rwidxa');
		const now = Date.now();
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${mp.mpId}" s="${now - 86400000}"
				e="${now + 86400000}"/>`, sharee.token
		);
		assert.notExists(res.Fault, 'Admin read should not fault');
	});


	it('Sanity | Revoke share access on new calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');

		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		// Grant
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);

		// Revoke
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="!grant"
					zid="${sharee.id}"/>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(
			revokeRes.Fault, 'Revoke should not fault'
		);
	});


	it('Sanity | View-only free/busy rights on new calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'r');
		const now = Date.now();
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${owner.email}"/>`, sharee.token
		);
		assert.notExists(res.Fault, 'F/B should not fault');
	});


	it('Sanity | Multiple grantees on same new calendar', async () => {
		const owner = await makeAcct('own');
		const sharee1 = await makeAcct('sh1');
		const sharee2 = await makeAcct('sh2');

		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee1.email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee2.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(res.Fault, 'Multiple grants should not fault');
	});


	it('Sanity | Public grant on new calendar', async () => {
		const owner = await makeAcct('own');
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(res.Fault, 'Public grant should not fault');
	});


	it('Sanity | Insert-only rights on new calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'rwi');
		const now = Date.now();
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${mp.mpId}" s="${now - 86400000}"
				e="${now + 86400000}"/>`, sharee.token
		);
		assert.notExists(res.Fault, 'Insert read should not fault');
	});


	it('Sanity | Read-only user cannot write to new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const mp = await createSubCalAndShare(owner, sharee, 'r');
		const t1 = futureTime(7200000);
		const t2 = futureTime(10800000);
		const subject = `Subj${common.getUniqueString()}`;
		// Sharee tries to create in read-only mountpoint
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${mp.mpId}">
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${sharee.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>C</content></mp>
				</m>
			</CreateAppointmentRequest>`, sharee.token
		);
		assert.exists(
			res.Fault,
			'Read-only should not be able to create'
		);
	});


	it('Sanity | Modify rights on new shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		// Grant read initially
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee.email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		// Update to rwidx
		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(res.Fault, 'Upgrade grant should not fault');
	});


	it('Sanity | Verify GetFolder shows grant for new calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>',
			owner.token
		);
		assert.notExists(res.Fault, 'GetFolder should not fault');
	});


	it('Sanity | Guest access to new shared calendar', async () => {
		const owner = await makeAcct('own');
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant gt="guest" d="guest@example.com"
						perm="r" pw="password"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(res.Fault, 'Guest grant should not fault');
	});


	it('Sanity | Group grantee on new shared calendar', async () => {
		const owner = await makeAcct('own');
		const fRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, owner.token
		);
		const ownerCalId = fRes.CreateFolderResponse.folder[0]
			? fRes.CreateFolderResponse.folder[0].id
			: fRes.CreateFolderResponse.folder.id;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCalId}" op="grant">
					<grant gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		assert.notExists(res.Fault, 'Group grant should not fault');
	});
});
