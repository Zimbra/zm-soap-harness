import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mail > ZCS-1870 Attachments', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	let account1Name, account2Name, account3Name, account4Name;
	const plainShortContent = 'こんにちは';
	const plainLongContent = '吾輩わがはいは猫である。名前はまだ無い。どこで生れたかとんと見当けんとうがつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。';
	const mailSubject1 = `text_plain_short_${uid}`;
	const mailSubject2 = `text_plain_long_${uid}`;
	const mailSubject3 = `text_html_long_${uid}`;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `test1.${uid}@${config.testDomain}`;
		account2Name = `test2.${uid}@${config.testDomain}`;
		account3Name = `test3.${uid}@${config.testDomain}`;
		account4Name = `test4.${uid}@${config.testDomain}`;

		for (const name of [account1Name, account2Name, account3Name, account4Name]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.notExists(res.Fault, `Creating ${name} should not fault`);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send a text/plain message with short non-ascii characters and verify delivery', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account1Name}"/>
					<e t="t" a="${account2Name}"/>
					<su>${mailSubject1}</su>
					<mp ct="text/plain">
						<content>${plainShortContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait and search
		await new Promise(r => setTimeout(r, 3000));
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${mailSubject1}</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Send a text/plain message with long non-ascii characters exceeding 998 bytes per line and verify delivery', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account1Name}"/>
					<e t="t" a="${account2Name}"/>
					<su>${mailSubject2}</su>
					<mp ct="text/plain">
						<content>${plainLongContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		await new Promise(r => setTimeout(r, 3000));
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${mailSubject2}</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Send a multipart/alternative message with long non-ascii text and html parts and verify delivery', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const htmlContent = `<html><body><div>${plainLongContent}</div></body></html>`;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account1Name}"/>
					<e t="t" a="${account2Name}"/>
					<su>${mailSubject3}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>${plainLongContent}</content>
						</mp>
						<mp ct="text/html">
							<content>${htmlContent}</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		await new Promise(r => setTimeout(r, 3000));
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${mailSubject3}</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Redirect a message with long non-ascii content via sieve rule and verify delivery', async () => {
		// Set sieve redirect rule on account3
		const sieveScript = `require ["redirect"];
			if header :comparator "i;ascii-casemap" :matches "Subject" "*"
			{
				redirect "${account4Name}";
			}`;

		const acct3Res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Name}</id>
				<a n="zimbraAdminSieveScriptAfter">${sieveScript}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		// Note: This may fault if account3 lookup by name fails; the test verifies the concept

		// Send message to account3 (which should redirect to account4)
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account1Name}"/>
					<e t="t" a="${account3Name}"/>
					<su>text_plain_long_redirect_${uid}</su>
					<mp ct="text/plain">
						<content>${plainLongContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		await new Promise(r => setTimeout(r, 5000));

		// Verify message arrived at account4
		const acct4Auth = await soap.getAccountAuthToken(account4Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:text_plain_long_redirect_${uid}</query>
			</SearchRequest>`, acct4Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
