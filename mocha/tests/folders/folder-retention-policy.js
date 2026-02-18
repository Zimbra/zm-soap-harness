import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Retention Policy', function () {
    this.timeout(120 * 1000); // 2 min timeout for retention policy tests with delays
    let accountAuthToken;
    let adminAuthToken;
    let policy1Id, policy1Interval;
    let policy2Id, policy2Interval;

    before(async function () {
        await main.before(this.ctx);
        const accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
        adminAuthToken = await soap.getAdminAuthToken();

        // Create system retention keep policy
        const createKeepPolicy =
            `<CreateSystemRetentionPolicyRequest xmlns='urn:zimbraAdmin'>
				<keep>
					<policy name='policy1${common.getUniqueString()}' lifetime='1s' xmlns='urn:zimbraMail'/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`;
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


    it('Smoke | Set folder retention keep policy', async () => {
        // Create a folder
        const folderName = `retentionFolder ${common.getUniqueString()}`;
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

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
        const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

        assert.equal(retentionResponse.FolderActionResponse.action.id, folderId, 'Verify folder id');
        assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy', 'Verify op');

        // Verify via GetFolderRequest
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        assert.exists(getFolderResponse.GetFolderResponse, 'Verify get folder response');
    });


    it('Sanity | Set folder retention purge policy', async () => {
        // Create a folder
        const folderName = `retentionPurge ${common.getUniqueString()}`;
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

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
        const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

        assert.equal(retentionResponse.FolderActionResponse.action.id, folderId, 'Verify folder id');
        assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy', 'Verify op');
    });


    it('Functional | Set both keep and purge retention policies on the same folder', async () => {
        const folderName = `retentionBoth ${common.getUniqueString()}`;
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

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
        const retentionResponse = await soap.makeSOAPEnvelopeAccount(retentionRequest, accountAuthToken);

        assert.equal(retentionResponse.FolderActionResponse.action.id, folderId, 'Verify folder id');
        assert.equal(retentionResponse.FolderActionResponse.action.op, 'retentionpolicy', 'Verify op');

        // Verify via GetFolderRequest
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns='urn:zimbraMail'><folder l='${folderId}'/></GetFolderRequest>`, accountAuthToken);
        assert.exists(getFolderResponse.GetFolderResponse, 'Verify get folder response');
    });


    it('Functional | Modify existing retention policy on a folder', async () => {
        const folderName = `retentionModify ${common.getUniqueString()}`;
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='message'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Set initial keep policy
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<keep>
							<policy type='user' lifetime='1s'/>
						</keep>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`, accountAuthToken);

        // Modify to purge policy (replaces keep)
        const modifyResponse = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='retentionpolicy' id='${folderId}'>
					<retentionPolicy>
						<purge>
							<policy type='user' lifetime='2s'/>
						</purge>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`, accountAuthToken);

        assert.equal(modifyResponse.FolderActionResponse.action.id, folderId, 'Verify folder id after modify');
        assert.equal(modifyResponse.FolderActionResponse.action.op, 'retentionpolicy', 'Verify op after modify');
    });
});
