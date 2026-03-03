import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Search > Folder > Mountpoint > Search Local Remote', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountEmail, accountEmail2, accountEmail3, accountEmail4;
	let accountAuthToken, accountAuthToken2, accountAuthToken3, accountAuthToken4;
	const account1 = {};
	const account2 = {};
	const account3 = {};
	const account4 = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1.id = res1.CreateAccountResponse.account[0].id;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2.id = res2.CreateAccountResponse.account[0].id;
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create folder1 under account1's inbox
		account1.folder1 = { name: `folder_${common.getUniqueString()}` };
		const resF = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${account1.folder1.name}" l="2" view="message"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		account1.folder1.id = resF.CreateFolderResponse.folder[0].id;

		// Add message to account1's folder
		account1.message1 = { subject: `msg_${common.getUniqueString()}` };
		const resM = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account1.folder1.id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${account1.message1.subject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)
Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		account1.message1.id = resM.AddMsgResponse.m[0].id;

		// Share account1's folder with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account1.folder1.id}" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);

		// Create mountpoint in account2
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mountpoint_${common.getUniqueString()}" view="message" rid="${account1.folder1.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);

		// Add local message in account2
		account2.message1 = {};
		const resM2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${account1.message1.subject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)
Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken2
		);
		account2.message1.id = resM2.AddMsgResponse.m[0].id;

		// Create account3 and account4 for recursive mountpoint test
		accountEmail3 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail3}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account3.id = res3.CreateAccountResponse.account[0].id;
		accountAuthToken3 = await soap.getAccountAuthToken(accountEmail3);

		accountEmail4 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail4}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account4.id = res4.CreateAccountResponse.account[0].id;
		accountAuthToken4 = await soap.getAccountAuthToken(accountEmail4);
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
	it('Smoke | Verify is - remote only returns remote items', async () => {
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify is - local only returns local items', async () => {
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:local</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify (is - remote OR is - local) returns remote and local items (Bug: 30224)', async () => {
		// Search messages
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>(is:remote OR is:local)</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search conversations
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>(is:remote OR is:local)</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Use (is - remote OR is - local) to search for local and shared messages', async () => {
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>(is:remote OR is:local)</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search contacts
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>(is:remote OR is:local)</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res4.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Use (is - remote OR is - local) to search for local and shared appointments', async () => {
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>(is:remote OR is:local)</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Recursive searches through mountpoint loops will hang the server (Bug: 20644)', async () => {
		const searchTerm = 'something';

		// Account3: Create folder u1f1 under inbox
		const folder3Name = `u1f1_${common.getUniqueString()}`;
		const resF3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="2" name="${folder3Name}"/>
			</CreateFolderRequest>`, accountAuthToken3
		);
		assert.notExists(resF3.Fault, 'Response should not be a Fault');
		const folder3Id = resF3.CreateFolderResponse.folder[0].id;

		// Share it with account4
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder3Id}" op="grant">
					<grant d="${accountEmail4}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken3
		);

		// Add message with search term
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder3Id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: SubjectValue
${searchTerm}
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken3
		);

		// Account4: Create folder u2f1 under inbox
		const folder4Name = `u2f1_${common.getUniqueString()}`;
		const resF4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="2" name="${folder4Name}"/>
			</CreateFolderRequest>`, accountAuthToken4
		);
		assert.notExists(resF4.Fault, 'Response should not be a Fault');
		const folder4Id = resF4.CreateFolderResponse.folder[0].id;

		// Share it with account3
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder4Id}" op="grant">
					<grant d="${accountEmail3}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken4
		);

		// Add message with search term
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder4Id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: SubjectValue
${searchTerm}
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken4
		);

		// Account3: Create mountpoint to account4's folder inside account3's folder (loop)
		const mp3Name = `u1f2_${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${folder3Id}" name="${mp3Name}" view="message" rid="${folder4Id}" zid="${account4.id}"/>
			</CreateMountpointRequest>`, accountAuthToken3
		);

		// Account4: Create mountpoint to account3's folder inside account4's folder (loop)
		const mp4Name = `u2f2_${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${folder4Id}" name="${mp4Name}" view="message" rid="${folder3Id}" zid="${account3.id}"/>
			</CreateMountpointRequest>`, accountAuthToken4
		);

		// Account3: Search for remote items - should not hang
		accountAuthToken3 = await soap.getAccountAuthToken(accountEmail3);
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote ${searchTerm}</query>
			</SearchRequest>`, accountAuthToken3
		);

		assert.notExists(res16.Fault, 'Response should not be a Fault');
	});
});
