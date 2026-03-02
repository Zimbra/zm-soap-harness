import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Bugs > Bug42129', function () {
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


	it('Sanity | Bug42129 - Resource auto-accept 1', async () => {
		const resName = `res${common.getUniqueString()}@${testDomain}`;

		// Send create calendar resource request
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Location</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		const acct = await makeAcct('org');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(86400000);
		const t2 = futureTime(90000000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<at role="REQ" ptst="NE" cutype="RES"
								rsvp="1" a="${resName}"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${resName}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Bug42129 - Resource auto-accept 2', async () => {
		const resName = `res${common.getUniqueString()}@${testDomain}`;

		// Send create calendar resource request
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Location</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		const acct = await makeAcct('org');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(172800000);
		const t2 = futureTime(176400000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<at role="REQ" ptst="NE" cutype="RES"
								rsvp="1" a="${resName}"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${resName}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Bug42129 - Resource auto-accept 3', async () => {
		const resName = `res${common.getUniqueString()}@${testDomain}`;

		// Send create calendar resource request
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);

		// Send search calendar resources request
		const searchRes = await soap.makeSOAPEnvelopeAdmin(
			`<SearchCalendarResourcesRequest xmlns="urn:zimbraAccount"
				limit="10" offset="0">
				<searchFilter>
					<conds>
						<cond attr="zimbraCalResType"
							op="eq" value="Equipment"/>
					</conds>
				</searchFilter>
			</SearchCalendarResourcesRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(
			searchRes.Fault,
			'Search resource should not fault'
		);
	});


});
