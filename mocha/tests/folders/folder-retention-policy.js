import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Retention Policy', function () {
	this.timeout(120 * 1000); // 2 min timeout for retention policy tests with delays
	let accountAuthToken;
	let adminAuthToken;
	let policy1Id, policy1Interval;
	let policy2Id, policy2Interval;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
		adminAuthToken = await soap.getAdminAuthToken();

		// Create system retention keep policy
		const createKeepPolicy =
			`<CreateSystemRetentionPolicyRequest xmlns='urn:zimbraAdmin'>
				<keep>
					<policy name='policy1${common.getUniqueString()}' lifetime='1s' xmlns='urn:zimbraMail'/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`;

		// CreateSystemRetentionPolicyRequest
		const keepResponse = await soap.makeSOAPEnvelopeAdmin(createKeepPolicy, adminAuthToken);

		policy1Id = keepResponse.CreateSystemRetentionPolicyResponse.policy[0].id;
		policy1Interval = keepResponse.CreateSystemRetentionPolicyResponse.policy[0].lifetime;

		// Create system retention purge policy
		const createPurgePolicy =
			`<CreateSystemRetentionPolicyRequest xmlns='urn:zimbraAdmin'>
				<purge>
					<policy name='policy2${common.getUniqueString()}' lifetime='1s' xmlns='urn:zimbraMail'/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`;
		const purgeResponse = await soap.makeSOAPEnvelopeAdmin(createPurgePolicy, adminAuthToken);

		policy2Id = purgeResponse.CreateSystemRetentionPolicyResponse.policy[0].id;
		policy2Interval = purgeResponse.CreateSystemRetentionPolicyResponse.policy[0].lifetime;
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
	it('Smoke | Set folder retention policy on a folder', async () => {
		// Create a folder
		const folderName = `retentionFolder ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Set retention keep policy
		const retentionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<keep>
							<policy type='user' lifetime='1s'/>
							<policy type='system' id='${policy1Id}' lifetime='${policy1Interval}'/>
						</keep>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

		// Verify response
		assert.notExists(retentionResponse.Fault, 'Retention should not be a Fault');
		assert.equal(retentionResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id');
		assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op');

		// Verify via GetFolderRequest
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse.folder[0].id,
			'Verify folder id in get response');
	});


	it('Sanity | Set folder retention policy on a folder', async () => {
		// Create a folder
		const folderName = `retentionPurge ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Set retention purge policy
		const retentionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<purge>
							<policy type='user' lifetime='1s'/>
							<policy type='system' id='${policy2Id}' lifetime='${policy2Interval}'/>
						</purge>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

		// Verify response
		assert.notExists(retentionResponse.Fault, 'Retention should not be a Fault');
		assert.equal(retentionResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id');
		assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op');
	});


	it('Sanity | Set folder retention keep policy on a folder and check if message is kept', async () => {
		const folderName = `retentionKeep ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Add a message to the folder
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${folderId}'>
					<content>Subject: retention keep test
					Test message for retention keep policy</content>
				</m>
			</AddMsgRequest>`;

		// AddMsgRequest
		const addMsgResponse = await soap.makeSOAPEnvelopeAccount(addMsgRequest, accountAuthToken);
		assert.notExists(addMsgResponse.Fault, 'AddMsg should not be a Fault');
		const msgId = addMsgResponse.AddMsgResponse.m[0].id;
		assert.exists(msgId, 'Message ID should exist');

		// Set retention keep policy
		const retentionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<keep>
							<policy type='system' id='${policy1Id}' lifetime='${policy1Interval}'/>
						</keep>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

		// Verify response
		assert.notExists(retentionResponse.Fault, 'Retention should not be a Fault');
		assert.equal(retentionResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id');
		assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op');

		// Verify message is still present (kept by policy)
		const getMsgRequest =
			`<GetMsgRequest xmlns='urn:zimbraMail'>
				<m id='${msgId}'/>
			</GetMsgRequest>`;

		// GetMsgRequest
		const getMsgResponse = await soap.makeSOAPEnvelopeAccount(getMsgRequest, accountAuthToken);

		// Verify response
		assert.notExists(getMsgResponse.Fault, 'GetMsg should not be a Fault');
		assert.exists(getMsgResponse.GetMsgResponse.m,
			'Message should be kept by retention keep policy');
		assert.exists(getMsgResponse.GetMsgResponse.m[0].id,
			'Message ID should exist in response');
	});


	it('Functional | Set folder retention purge policy on a folder and check if message is purged', async () => {
		const folderName = `retentionBoth ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Set both keep and purge
		const retentionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<keep>
							<policy type='user' lifetime='1s'/>
							<policy type='system' id='${policy1Id}' lifetime='${policy1Interval}'/>
						</keep>
						<purge>
							<policy type='user' lifetime='1s'/>
							<policy type='system' id='${policy2Id}' lifetime='${policy2Interval}'/>
						</purge>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

		// Verify response
		assert.notExists(retentionResponse.Fault, 'Retention should not be a Fault');
		assert.equal(retentionResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id');
		assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op');

		// Verify via GetFolderRequest
		const getFolderRequest2 =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse.folder[0].id,
			'Verify folder id in get response');
	});


	it('Functional | Set folder retention policy on a folder', async () => {
		const folderName = `retentionModify ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Set initial keep policy
		const folderActionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<keep>
							<policy type='user' lifetime='1s'/>
						</keep>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const keepResponse = await soap.makeSOAPEnvelopeAccount(folderActionRequest, accountAuthToken);
		assert.notExists(keepResponse.Fault, 'Keep retention should not be a Fault');
		assert.equal(keepResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op for initial keep');

		// Modify to purge policy (replaces keep)
		const folderActionRequest2 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<purge>
							<policy type='user' lifetime='2s'/>
						</purge>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;
		const modifyResponse = await soap.makeSOAPEnvelopeAccount(folderActionRequest2, accountAuthToken);

		// Verify response
		assert.notExists(modifyResponse.Fault, 'Modify retention should not be a Fault');
		assert.equal(modifyResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id after modify');
		assert.equal(modifyResponse.FolderActionResponse.action.op, 'retentionpolicy',
			'Verify op after modify');
	});

});
