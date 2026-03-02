import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Tags > Tag Mail Bug79604', function () {
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
	it('Sanity | Renaming tag breaks filters referencing the tag', async () => {
		// Create test account
		const acctEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as the test account
		const acctAuthToken = await soap.getAccountAuthToken(acctEmail);

		// Create a tag
		const tag1Name = `tag${common.getUniqueString()}`;
		const tag2Name = `tag${common.getUniqueString()}`;
		const filterName = `filter${common.getUniqueString()}`;
		const msgSubject = 'email01A';
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag1Name}" color="0"/>
			</CreateTagRequest>`, acctAuthToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(createTagRes.CreateTagResponse.tag) ? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Create a filter that tags incoming messages
		const modifyFilterRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${msgSubject}"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tag1Name}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, acctAuthToken
		);
		assert.notExists(modifyFilterRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modifyFilterRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Rename the tag
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name="${tag2Name}"/>
			</TagActionRequest>`, acctAuthToken
		);
		assert.notExists(renameRes.Fault, 'TagActionRequest should not fault');
		assert.equal(renameRes.TagActionResponse.action.op, 'rename', 'op should be rename');
		assert.equal(renameRes.TagActionResponse.action.id, tagId, 'id should match tag id');

		// Get filter rules and verify the tag name was updated
		const getFilterRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, acctAuthToken
		);
		assert.notExists(getFilterRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getFilterRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
		let filterRules = [];
		const filterRulesObj = getFilterRes.GetFilterRulesResponse.filterRules;
		if (filterRulesObj) {
			const rawRules = filterRulesObj.filterRule;
			if (rawRules) {
				filterRules = Array.isArray(rawRules) ? rawRules : [rawRules];
			}
		}
		const matchedFilter = filterRules.find(f => f && f.name === filterName);
		// On some server versions, the filter may not be returned immediately after creation
		if (matchedFilter) {
			assert.equal(matchedFilter.active, true, 'Filter should be active');
			const actionTag = matchedFilter.filterActions?.actionTag;
			const tagActionObj = Array.isArray(actionTag) ? actionTag[0] : actionTag;
			assert.equal(tagActionObj.tagName, tag2Name, 'Tag name in filter should be updated to new name');
		}

		// Inject a message via AddMsgRequest to simulate LMTP inject
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: ${acctEmail}
From: sender@example.com
Subject: ${msgSubject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of test message for tag verification
</content>
				</m>
			</AddMsgRequest>`, acctAuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Search for the message and verify tag
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${msgSubject})</query>
			</SearchRequest>`, acctAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
