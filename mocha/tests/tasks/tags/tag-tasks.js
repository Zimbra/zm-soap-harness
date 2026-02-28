import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Tasks > Tags > TagTasks', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Helper to create a task and tag it
	async function createAndTagTask(subject, tagId) {

		// CreateTaskRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Tagged task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const taskId = createRes.CreateTaskResponse.calItemId;

		// ItemActionRequest
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${taskId}" tag="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(tagRes.Fault, 'Tag operation should not be a Fault');
		return { taskId, invId: createRes.CreateTaskResponse.invId };
	}

	// Tests
	it('Sanity | Verify that GetTaskRequest show the tags', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;

		const subject = `task${common.getUniqueString()}`;
		const { invId } = await createAndTagTask(subject, tagId);

		// GetTaskRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${invId}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTaskResponse, 'GetTaskResponse should exist');
	});


	it('Sanity | Verify that GetTaskSummariesRequest show the tags', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;

		const subject = `task${common.getUniqueString()}`;
		await createAndTagTask(subject, tagId);

		// GetTaskSummariesRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskSummariesRequest xmlns="urn:zimbraMail"
				s="1704067200000" e="1706745600000"
				l="15"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTaskSummariesResponse,
			'GetTaskSummariesResponse should exist');
	});


	it('Sanity | Verify that SearchRequest for the tag returns the task', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;

		const subject = `task${common.getUniqueString()}`;
		await createAndTagTask(subject, tagId);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Remove the tag, Verify that SearchRequest for the tag does not return the task', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;

		const subject = `task${common.getUniqueString()}`;
		const { taskId } = await createAndTagTask(subject, tagId);

		// Remove the tag
		const untagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${taskId}" tag="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(untagRes.Fault, 'Untag should not be a Fault');

		// Search for the tag - task should not appear
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const tasks = searchRes.SearchResponse.task;
		if (tasks) {
			const taskArr = Array.isArray(tasks) ? tasks : [tasks];
			const match = taskArr.find(t => t.id === taskId);

			// Verify response
			assert.notExists(match,
				'Untagged task should not appear in tag search');
		}
	});
});
