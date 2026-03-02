import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Bugs > Bug 78473', function () {
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
		const subs = Array.isArray(root.folder)
			? root.folder : [root.folder];
		return {
			rootId: root.id,
			calId: subs.find(f => f.name === 'Calendar').id
		};
	}


	it('Functional | Bug78473 - Shared calendar search', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const ownerCal = await getCalFolder(owner.token);

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCal.calId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
		);
		const shreeCal = await getCalFolder(sharee.token);

		// Create a mountpoint
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shreeCal.rootId}"
					name="SC${common.getUniqueString()}"
					view="appointment"
					rid="${ownerCal.calId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
		);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, sharee.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Shared search should not fault');
	});


});
