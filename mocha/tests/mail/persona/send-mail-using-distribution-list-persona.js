import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Persona > Send Mail Using Distribution List Persona', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Verify sendAsDistList DL rights and no servicePERMDENIED error when sending email to distribution list and using persona', async () => {
		// Create accounts and DL
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test3.${common.getUniqueString()}@${testDomain}`;
		const dlName = `testdl1.${common.getUniqueString()}@${testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create DL and add members
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDistributionListRequest should not fault');
		const dlId = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0].id
			: dlRes.CreateDistributionListResponse.dl.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account1Email}</dlm>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Grant sendAsDistList right
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="dl" by="name">${dlName}</target>
				<grantee type="usr" by="name">${account1Email}</grantee>
				<right>sendAsDistList</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Verify right using DiscoverRightsRequest
		const discoverRes = await soap.makeSOAPEnvelopeAccount(
			`<DiscoverRightsRequest xmlns="urn:zimbraAccount">
				<right>sendAsDistList</right>
			</DiscoverRightsRequest>`, account1AuthToken
		);
		assert.notExists(discoverRes.Fault, 'DiscoverRightsRequest should not fault');

		// Send email with From set to DL
		const subject = `test mail ${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${dlName}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded (no PERM_DENIED)
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Verify message details
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, dlName, 'From should be the DL');

		// Create persona for DL and send using persona
		const personaName = `persona${common.getUniqueString()}`;
		const personaDisplay = `First${common.getUniqueString()} Last`;
		const createIdentRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${personaName}">
					<a name="zimbraPrefIdentityName">${personaName}</a>
					<a name="zimbraPrefFromDisplay">${personaDisplay}</a>
					<a name="zimbraPrefFromAddress">${dlName}</a>
					<a name="zimbraPrefFromAddressType">sendAs</a>
				</identity>
			</CreateIdentityRequest>`, account1AuthToken
		);
		assert.notExists(createIdentRes.Fault, 'CreateIdentityRequest should not fault');
		const personaId = Array.isArray(createIdentRes.CreateIdentityResponse.identity)
			? createIdentRes.CreateIdentityResponse.identity[0].id
			: createIdentRes.CreateIdentityResponse.identity.id;

		// Send email using persona
		const subject2 = `test mail from persona ${common.getUniqueString()}`;
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m idnt="${personaId}">
					<e t="f" a="${dlName}" p="${personaName}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes2.Fault, 'SendMsgRequest should not fault');
	});


	it('Sanity | Verify sendOnBehalfOfDistList DL rights and no servicePERMDENIED error when sending email to distribution list and using persona', async () => {
		// Create accounts and DL
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test3.${common.getUniqueString()}@${testDomain}`;
		const dlName = `testdl2.${common.getUniqueString()}@${testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create DL and add members
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDistributionListRequest should not fault');
		const dlId = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0].id
			: dlRes.CreateDistributionListResponse.dl.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account1Email}</dlm>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOfDistList right to account2
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="dl" by="name">${dlName}</target>
				<grantee type="usr" by="name">${account2Email}</grantee>
				<right>sendOnBehalfOfDistList</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Verify right using DiscoverRightsRequest
		const discoverRes = await soap.makeSOAPEnvelopeAccount(
			`<DiscoverRightsRequest xmlns="urn:zimbraAccount">
				<right>sendOnBehalfOfDistList</right>
			</DiscoverRightsRequest>`, account2AuthToken
		);
		assert.notExists(discoverRes.Fault, 'DiscoverRightsRequest should not fault');

		// Send email with From set to DL
		const subject = `test mail - sendOnBehalfOfDistList test ${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${dlName}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Create persona for DL
		const personaName = `persona2${common.getUniqueString()}`;
		const personaDisplay = `First2${common.getUniqueString()} Last`;
		const createIdentRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${personaName}">
					<a name="zimbraPrefIdentityName">${personaName}</a>
					<a name="zimbraPrefFromDisplay">${personaDisplay}</a>
					<a name="zimbraPrefFromAddress">${dlName}</a>
					<a name="zimbraPrefFromAddressType">sendOnBehalfOf</a>
				</identity>
			</CreateIdentityRequest>`, account2AuthToken
		);
		assert.notExists(createIdentRes.Fault, 'CreateIdentityRequest should not fault');
		const personaId = Array.isArray(createIdentRes.CreateIdentityResponse.identity)
			? createIdentRes.CreateIdentityResponse.identity[0].id
			: createIdentRes.CreateIdentityResponse.identity.id;

		// Send email using persona
		const subject2 = `test mail - sendOnBehalfOfDistList test ${common.getUniqueString()}`;
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m idnt="${personaId}">
					<e t="f" a="${dlName}" p="${personaName}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes2.Fault, 'SendMsgRequest should not fault');
	});
});
