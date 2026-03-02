import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 76013', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Replies from persona are displayed double in the persona send mail box', async () => {
		// Create accounts
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOf right
		await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendOnBehalfOf</right>
			</GrantRightRequest>`, adminAuthToken
		);

		// Account1 shares inbox and sent with account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		const root1 = Array.isArray(getFolderRes1.GetFolderResponse.folder)
			? getFolderRes1.GetFolderResponse.folder[0]
			: getFolderRes1.GetFolderResponse.folder;
		const inbox1 = Array.isArray(root1.folder)
			? root1.folder.find(f => f.name === 'Inbox') : root1.folder;
		const sent1 = Array.isArray(root1.folder)
			? root1.folder.find(f => f.name === 'Sent') : root1.folder;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inbox1.id}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${sent1.id}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account2 creates mountpoints and persona
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;
		const sent2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Sent') : root2.folder;

		const folderMount1 = `folder1${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2.id}" name="${folderMount1}" zid="${account1Id}"
					rid="${inbox1.id}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		const folderMount2 = `folder2${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${sent2.id}" name="${folderMount2}" zid="${account1Id}"
					rid="${sent1.id}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		// Create persona identity
		const identityName = `Identity${common.getUniqueString()}`;
		const displayName = `First${common.getUniqueString()} Last${common.getUniqueString()}`;
		const identityRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefIdentityName">${identityName}</a>
					<a name="zimbraPrefFromDisplay">${displayName}</a>
					<a name="zimbraPrefFromAddress">${account1Email}</a>
					<a name="zimbraPrefFromAddressType">sendAs</a>
				</identity>
			</CreateIdentityRequest>`, account2AuthToken
		);
		assert.notExists(identityRes.Fault, 'CreateIdentityRequest should not fault');
		const identity = identityRes.CreateIdentityResponse.identity;
		const identityObj = Array.isArray(identity) ? identity[0] : identity;
		const identityId = identityObj.id;

		// Create filter
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="Filter${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is"
								value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Sent/${folderMount2}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account2AuthToken
		);

		// Send message to account1
		const composeSubject = 'Subject of the message is testing bug.';
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su> ${composeSubject} </su>
					<mp ct="text/plain">
						<content> Content in the message is testing bug. </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for mail delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Search for message in shared inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox/${folderMount1}" ${composeSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in shared inbox');
		const messageId = msgs[0].id;

		// Reply as persona
		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${messageId}" rt="r" idnt="${identityId}">
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}" p="${identityName}"/>
					<su>Re: ${composeSubject}</su>
					<mp ct="multipart/mixed">
						<content>----- Original Message ----- Content in the message is testing bug.</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(replyRes.Fault, 'Reply SendMsgRequest should not fault');

		// Verify reply appears only once in sent
		const sentSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>in:sent ${composeSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(sentSearchRes.Fault, 'SearchRequest should not fault');
		assert.exists(sentSearchRes.SearchResponse, 'SearchResponse should exist');
	});
});
