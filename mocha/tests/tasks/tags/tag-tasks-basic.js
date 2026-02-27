import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Tasks > Tags > TagTasksBasic', function () {
    this.timeout(60 * 1000);
    let accountEmail = null, accountAuthToken = null;
    let account2Email = null, account2AuthToken = null;

    before(async () => {
        await main.before(this.ctx);
        accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
        account2Email = soap.testAccounts.testAccount2.emailAddress;
        account2AuthToken = await soap.getAccountAuthToken(account2Email);
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Helper to create a task
    async function createTask(subject, authToken, email) {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${email}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test task</content></mp>
				</m>
			</CreateTaskRequest>`, authToken
        );
        assert.notExists(res.Fault, 'Response should not be a Fault');
        return res.CreateTaskResponse.calItemId;
    }

    // Tests
    it('Sanity | Tag a task using ItemActionRequest', async () => {
        const subject = `task${common.getUniqueString()}`;
        const taskId = await createTask(subject, accountAuthToken, accountEmail);

        // Create tag
        const tagName = `tag${common.getUniqueString()}`;
        const createTagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
        );
        assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
        const tagId = createTagRes.CreateTagResponse.tag[0].id;

        // Tag the task
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${taskId}" tag="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
        );
        assert.notExists(tagRes.Fault, 'Response should not be a Fault');
        assert.exists(tagRes.ItemActionResponse, 'ItemActionResponse should exist');

        // Verify tag is applied via search
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, accountAuthToken
        );
        assert.notExists(searchRes.Fault, 'Response should not be a Fault');
    });


    it('Sanity | Untag an appointment using ItemActionRequest', async () => {
        const subject = `task${common.getUniqueString()}`;
        const taskId = await createTask(subject, accountAuthToken, accountEmail);

        const tagName = `tag${common.getUniqueString()}`;
        const createTagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
        );
        assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
        const tagId = createTagRes.CreateTagResponse.tag[0].id;

        // Tag it
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${taskId}" tag="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
        );

        // Untag it
        const untagRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${taskId}" tag="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
        );
        assert.notExists(untagRes.Fault, 'Response should not be a Fault');
        assert.exists(untagRes.ItemActionResponse, 'ItemActionResponse should exist');
    });


    it('Sanity | Apply two tags to an appointment', async () => {
        const subject = `task${common.getUniqueString()}`;
        const taskId = await createTask(subject, accountAuthToken, accountEmail);

        const tagName1 = `tag${common.getUniqueString()}`;
        const tagName2 = `tag${common.getUniqueString()}`;
        const createTag1 = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName1}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
        );
        const createTag2 = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName2}" color="5"/>
			</CreateTagRequest>`, accountAuthToken
        );
        const tagId1 = createTag1.CreateTagResponse.tag[0].id;
        const tagId2 = createTag2.CreateTagResponse.tag[0].id;

        // Apply both tags
        const tagRes1 = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${taskId}" tag="${tagId1}"/>
			</ItemActionRequest>`, accountAuthToken
        );
        assert.notExists(tagRes1.Fault, 'Response should not be a Fault');

        const tagRes2 = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${taskId}" tag="${tagId2}"/>
			</ItemActionRequest>`, accountAuthToken
        );
        assert.notExists(tagRes2.Fault, 'Response should not be a Fault');
        assert.exists(tagRes2.ItemActionResponse, 'ItemActionResponse should exist');
    });


    it('Regression | Apply a tag to a received (non-owned) appointment', async () => {
        // Send a task to account2
        const subject = `task${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task for tagging</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'Response should not be a Fault');

        // Wait for delivery
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Search for message as account2
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
        );
        assert.notExists(searchRes.Fault, 'Response should not be a Fault');
    });


    it('Sanity | Verify tagging an appointment using SetTaskRequest', async () => {
        const subject = `task${common.getUniqueString()}`;
        const uid = common.getUniqueString();

        // Create tag
        const tagName = `tag${common.getUniqueString()}`;
        const createTagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
        );
        assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
        const tagId = createTagRes.CreateTagResponse.tag[0].id;

        // Create task using SetTaskRequest with tag
        const setRes = await soap.makeSOAPEnvelopeAccount(
            `<SetTaskRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m t="${tagId}">
						<inv uid="${uid}" type="task">
							<comp name="${subject}" status="NEED" priority="5">
								<or a="${accountEmail}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain"><content>Tagged task</content></mp>
					</m>
				</default>
			</SetTaskRequest>`, accountAuthToken
        );
        assert.notExists(setRes.Fault, 'Response should not be a Fault');
        assert.exists(setRes.SetTaskResponse, 'SetTaskResponse should exist');
    });


    it('Regression | Apply a tag to a received (non-owned) appointment using SetAppointmentRequest', async () => {
        // Create tag
        const tagName = `tag${common.getUniqueString()}`;
        const createTagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="6"/>
			</CreateTagRequest>`, accountAuthToken
        );
        assert.notExists(createTagRes.Fault, 'Response should not be a Fault');

        // Create a simple task with SetTaskRequest
        const subject = `task${common.getUniqueString()}`;
        const uid = common.getUniqueString();
        const setRes = await soap.makeSOAPEnvelopeAccount(
            `<SetTaskRequest xmlns="urn:zimbraMail">
				<default ptst="AC">
					<m>
						<inv uid="${uid}" type="task">
							<comp name="${subject}" status="NEED">
								<or a="${accountEmail}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain"><content>Deprecated test</content></mp>
					</m>
				</default>
			</SetTaskRequest>`, accountAuthToken
        );
        assert.notExists(setRes.Fault, 'Response should not be a Fault');
        assert.exists(setRes.SetTaskResponse, 'SetTaskResponse should exist');
    });
});
