import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Create Meeting Request Aliases', function () {
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
	it('Smoke | Create a basic blobless meesting request', async () => {
		// Create account1
		const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acct1Res.CreateAccountResponse.account[0].id, 'Account 1 ID should exist');
		const acct1Token = await soap.getAccountAuthToken(acct1Email);

		// Create account2
		const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
		const acct2Id = acct2Res.CreateAccountResponse.account[0].id;
		assert.exists(acct2Id, 'Account 2 ID should exist');
		const acct2Token = await soap.getAccountAuthToken(acct2Email);

		// Add alias to account2
		const aliasEmail = `alias${common.getUniqueString()}@${testDomain}`;
		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2Id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(aliasRes.Fault, 'AddAccountAliasRequest should not fault');

		// Create appointment to account2 alias
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct1Email}"/>
							<at a="${aliasEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${aliasEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct1Token
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const invId = createRes.CreateAppointmentResponse.invId;
		assert.exists(invId, 'Appointment invId should exist');

		// Verify noBlob on organizer
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(String(msg.inv[0].comp[0].noBlob), '1', 'noBlob should be 1');

		// Verify account2 sees the appointment
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>subject:(${subject}) is:anywhere</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		assert.isAtLeast(appts.length, 1, 'Account 2 should see the appointment');
		const acct2InvId = appts[0].invId;
		assert.exists(acct2InvId, 'Account 2 appointment invId should exist');

		// Verify noBlob on invitee
		const getMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${acct2InvId}"/>
			</GetMsgRequest>`, acct2Token
		);
		assert.notExists(getMsg2Res.Fault, 'GetMsgRequest should not fault');
		const msg2 = Array.isArray(getMsg2Res.GetMsgResponse.m)
			? getMsg2Res.GetMsgResponse.m[0] : getMsg2Res.GetMsgResponse.m;
		assert.equal(String(msg2.inv[0].comp[0].noBlob), '1', 'noBlob should be 1 on invitee');
	});
});
