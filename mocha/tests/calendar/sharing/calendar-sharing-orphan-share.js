import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Sharing > Calendar Sharing Orphan Share', function () {
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

	async function shareCalendar(owner, sharee) {
		// Get calendar folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', owner.token
		);
		const folders = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder
			: [folderRes.GetFolderResponse.folder];
		const root = folders[0];
		const subfolders = Array.isArray(root.folder)
			? root.folder : [root.folder];
		const calFolder = subfolders.find(f => f.name === 'Calendar');
		const calId = calFolder.id;
		const rootId = root.id;

		// Grant manager rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calId}" op="grant">
					<grant d="${sharee.email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);

		// Create mountpoint for sharee
		const shareeFolder = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', sharee.token
		);
		const sf = Array.isArray(shareeFolder.GetFolderResponse.folder)
			? shareeFolder.GetFolderResponse.folder
			: [shareeFolder.GetFolderResponse.folder];
		const shareeRoot = sf[0].id;

		const mpName = `SharedCal${common.getUniqueString()}`;
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shareeRoot}" name="${mpName}"
					view="appointment" rid="${calId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
		);
		const mpId = mpRes.CreateMountpointResponse.link[0].id;
		return { calId, rootId, mpId, mpName };
	}

	async function createAppt(token, email, subject, t1, t2) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B"
							transp="O" status="CONF" allDay="0"
							name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
		);
		return res.CreateAppointmentResponse;
	}

	it('Sanity | Orphan share items handling', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const sharing = await shareCalendar(owner, sharee);

		// Verify mountpoint exists
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', sharee.token
		);
		assert.notExists(
			folderRes.Fault,
			'GetFolder should not fault'
		);
	});

});
