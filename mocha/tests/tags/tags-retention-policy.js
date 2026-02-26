import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Retention Policy', function () {
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

	// Tests
	it('Sanity | Set tag retention policy on a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Set retention policy
		const retRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="retentionpolicy" id="${tagId}">
					<retentionPolicy>
						<keep>
							<policy lifetime="30d" type="user"/>
						</keep>
					</retentionPolicy>
				</action>
			</TagActionRequest>`, accountAuthToken
		);
		assert.notExists(retRes.Fault, 'Response should not be a Fault');
		assert.exists(retRes.TagActionResponse, 'TagActionResponse should exist');

		// Verify via GetTag
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);
		assert.exists(matchTag, 'Tag should exist in GetTagResponse');
		assert.exists(matchTag.retentionPolicy, 'Tag should have retentionPolicy');
	});


	it('Sanity | Set tag retention purge policy on a tag and check if message is purged', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Set purge/dispose policy
		const retRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="retentionpolicy" id="${tagId}">
					<retentionPolicy>
						<purge>
							<policy lifetime="1s" type="user"/>
						</purge>
					</retentionPolicy>
				</action>
			</TagActionRequest>`, accountAuthToken
		);
		assert.notExists(retRes.Fault, 'Response should not be a Fault');
		assert.exists(retRes.TagActionResponse, 'TagActionResponse should exist');

		// Send a message and tag it
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content for purge</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		assert.isAbove(msgs.length, 0, 'Should find the sent message');
		const msgId = msgs[0].id;

		// Tag the message
		const tagMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${msgId}" tag="${tagId}"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(tagMsgRes.Fault, 'Response should not be a Fault');

		// Verify the tag was applied
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);
		assert.exists(matchTag, 'Tag should exist in GetTagResponse');
	});
});
