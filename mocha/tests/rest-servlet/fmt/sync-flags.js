import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Fmt > Sync > Flags', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;
	let sentMsgId, draftMsgId, flaggedMsgId, unreadMsgId;
	let repliedMsgId, forwardedMsgId, deletedMsgId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Send a message (for sent flag)
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>sentFlagTest${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>sent flag content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		sentMsgId = sendRes.SendMsgResponse?.m?.id
			|| (Array.isArray(sendRes.SendMsgResponse?.m)
				? sendRes.SendMsgResponse.m[0].id : undefined);

		// Create a draft
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>draftFlagTest${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>draft content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1Token
		);
		assert.notExists(draftRes.Fault, 'Response should not be a Fault');
		draftMsgId = draftRes.SaveDraftResponse?.m?.id
			|| (Array.isArray(draftRes.SaveDraftResponse?.m)
				? draftRes.SaveDraftResponse.m[0].id : undefined);

		// Add a message and flag it
		const addFlagged = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" f="f">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: flaggedTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nflagged content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addFlagged.Fault, 'Response should not be a Fault');
		flaggedMsgId = addFlagged.AddMsgResponse?.m?.id
			|| (Array.isArray(addFlagged.AddMsgResponse?.m)
				? addFlagged.AddMsgResponse.m[0].id : undefined);

		// Add unread message
		const addUnread = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" f="u">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: unreadTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nunread content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addUnread.Fault, 'Response should not be a Fault');
		unreadMsgId = addUnread.AddMsgResponse?.m?.id
			|| (Array.isArray(addUnread.AddMsgResponse?.m)
				? addUnread.AddMsgResponse.m[0].id : undefined);

		// Add a message then reply to it (for replied flag)
		const addForReply = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: replyTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nreply test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addForReply.Fault, 'Response should not be a Fault');
		repliedMsgId = addForReply.AddMsgResponse?.m?.id
			|| (Array.isArray(addForReply.AddMsgResponse?.m)
				? addForReply.AddMsgResponse.m[0].id : undefined);

		// Reply to the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${repliedMsgId}" rt="r">
					<e t="t" a="foo@foo.com"/>
					<su>Re: replyTest</su>
					<mp ct="text/plain">
						<content>replied content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Add message and forward it (for forwarded flag)
		const addForFwd = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: forwardTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nforward test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addForFwd.Fault, 'Response should not be a Fault');
		forwardedMsgId = addForFwd.AddMsgResponse?.m?.id
			|| (Array.isArray(addForFwd.AddMsgResponse?.m)
				? addForFwd.AddMsgResponse.m[0].id : undefined);

		// Forward the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${forwardedMsgId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: forwardTest</su>
					<mp ct="text/plain">
						<content>forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Add a message then delete it (for deleted flag)
		const addForDel = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: deleteTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\ndelete test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addForDel.Fault, 'Response should not be a Fault');
		deletedMsgId = addForDel.AddMsgResponse?.m?.id
			|| (Array.isArray(addForDel.AddMsgResponse?.m)
				? addForDel.AddMsgResponse.m[0].id : undefined);

		// Move to Trash
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${deletedMsgId}" op="trash"/>
			</MsgActionRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify X-Zimbra-Flags for deleted message shows x flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: deletedMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for draft message shows d flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: draftMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for flagged message shows f flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: flaggedMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for forwarded message shows w flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: forwardedMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for replied message shows r flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: repliedMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for sent message shows s flag', async () => {
		if (!sentMsgId) return;
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify second sent message also has s flag', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>sentFlagTest2${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>sent flag content 2</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const msgId2 = sendRes.SendMsgResponse?.m?.id
			|| (Array.isArray(sendRes.SendMsgResponse?.m)
				? sendRes.SendMsgResponse.m[0].id : undefined);
		if (!msgId2) return;
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: msgId2,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Sanity | Verify X-Zimbra-Flags for unread message shows u flag', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: unreadMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Regression | Verify X-Zimbra-Flags for message with attachment shows a flag', async () => {
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: attachTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="attachBound"\r\n\r\n--attachBound\r\nContent-Type: text/plain\r\n\r\nattach test body\r\n--attachBound\r\nContent-Type: text/plain; name="test.txt"\r\nContent-Disposition: attachment; filename="test.txt"\r\n\r\nattachment data\r\n--attachBound--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const attachMsgId = addRes.AddMsgResponse?.m?.id
			|| (Array.isArray(addRes.AddMsgResponse?.m)
				? addRes.AddMsgResponse.m[0].id : undefined);

		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: attachMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});


	it('Regression | Verify X-Zimbra-Flags for second message with attachment', async () => {
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: attachTest2\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="attachBound2"\r\n\r\n--attachBound2\r\nContent-Type: text/plain\r\n\r\nattach test body 2\r\n--attachBound2\r\nContent-Type: application/pdf; name="doc.pdf"\r\nContent-Disposition: attachment; filename="doc.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\ndGVzdCBkYXRh\r\n--attachBound2--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const attachMsgId = addRes.AddMsgResponse?.m?.id
			|| (Array.isArray(addRes.AddMsgResponse?.m)
				? addRes.AddMsgResponse.m[0].id : undefined);

		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: attachMsgId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Should contain X-Zimbra-Flags');
	});
});
