import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Mountpoint > Create Mountpoint', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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
		const subs = Array.isArray(root.folder)
			? root.folder : [root.folder];
		return {
			rootId: root.id,
			calId: subs.find(f => f.name === 'Calendar').id
		};
	}


	it('Sanity | Shared calendar can be mounted', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const ownerCal = await getCalFolder(owner.token);

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCal.calId}" op="grant">
					<grant d="${sharee.email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		const shareeCal = await getCalFolder(sharee.token);

		// Create a mountpoint
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shareeCal.rootId}"
					name="SC${common.getUniqueString()}"
					view="appointment" rid="${ownerCal.calId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
		);

		// Verify response
		assert.notExists(mpRes.Fault, 'Mount should not fault');
		assert.exists(mpRes.CreateMountpointResponse.link, 'Link should exist');
	});


	it('Sanity | Mountpoint for non-existing account', async () => {
		const sharee = await makeAcct('shr');
		const fakeId = '00000000-0000-0000-0000-000000000000';
		const shareeCal = await getCalFolder(sharee.token);

		// Create a mountpoint
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shareeCal.rootId}"
					name="Bad${common.getUniqueString()}"
					view="appointment" rid="10"
					zid="${fakeId}"/>
			</CreateMountpointRequest>`, sharee.token
		);

		// Verify response
		assert.exists(
			mpRes.Fault,
			'Mountpoint with non-existing account should fault'
		);
	});


	it('Functional | GetMiniCalRequest after owner deleted', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const ownerCal = await getCalFolder(owner.token);

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCal.calId}" op="grant">
					<grant d="${sharee.email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		const shareeCal = await getCalFolder(sharee.token);

		// Create a mountpoint
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shareeCal.rootId}"
					name="SC${common.getUniqueString()}"
					view="appointment" rid="${ownerCal.calId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
		);
		const mpId = mpRes.CreateMountpointResponse.link[0].id;

		// Delete the account
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${owner.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		const now = Date.now();

		// Send get mini cal request
		const miniRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 30 * 86400000}">
				<folder id="${mpId}"/>
			</GetMiniCalRequest>`, sharee.token
		);

		// Verify response
		assert.notExists(miniRes.Fault, 'Should handle orphan gracefully');
	});
});
