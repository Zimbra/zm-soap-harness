import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Noop > Noop Request Delegate', function () {
	this.timeout(120 * 1000);
	let account1Email, account2Email;
	let account1AuthToken, account2AuthToken;
	let account2FolderId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `account1${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `account2${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		const account2Id = account2.id;

		account1AuthToken = await soap.getAccountAuthToken(account1Email);
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create a shared folder from account2
		const folderName = `folder${common.getUniqueString()}`;

		// CreateFolderRequest
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, account2AuthToken
		);
		account2FolderId = createFolderRes.CreateFolderResponse.folder[0].id
			|| createFolderRes.CreateFolderResponse.folder.id;

		// Grant access to account1
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account2FolderId}" op="grant">
					<grant d="${account1Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Create mountpoint for account1
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${account2Email}.${folderName}" view="message"
					rid="${account2FolderId}" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
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
	it('Functional | Send NoOpRequest with delegate 0, no delegate changes should be returned (bug 22369)', async () => {
		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// NoOpRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail" wait="1" delegate="0" timeout="5000"/>',
			account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'NoOpRequest should not fault: ' + JSON.stringify(res.Fault));
	});


	it('Functional | Send NoOpRequest with delegate 1, delegate changes should be returned immediately 1', async () => {
		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account2FolderId}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, account2AuthToken
		);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'NoOpRequest should not fault');
	});


	it('Functional | Send NoOpRequest without delegate (default - delegate 1), delegate changes should be returned immediately', async () => {
		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account2FolderId}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, account2AuthToken
		);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'NoOpRequest should not fault');
	});
});
