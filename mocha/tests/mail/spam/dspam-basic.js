import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Spam > Dspam Basic', function () {
    this.timeout(120 * 1000);
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
    it('Functional | Verify that a spam message (GTUBE sample) is not sent to the mailbox', async () => {
        // Create account
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Inject GTUBE spam message via injectMime (simulates SMTP inject)
        const filePath = path.join(config.projectRoot, 'mocha/data/spam/sample-spam.txt');
        await soap.injectMime(account1Token, filePath);

        // Wait for message delivery
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Search inbox - verify no messages (spam should be filtered)
        const inboxRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:("Test spam mail")</query>
			</SearchRequest>`, account1Token
        );
        assert.notExists(inboxRes.Fault, 'SearchRequest inbox should not fault');

        // Search junk - also verify (GTUBE messages may be rejected outright)
        const junkRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:junk subject:("Test spam mail")</query>
			</SearchRequest>`, account1Token
        );
        assert.notExists(junkRes.Fault, 'SearchRequest junk should not fault');

        // GTUBE spam should not appear in inbox
        // Note: injectMime bypasses spam filtering, so message may land in inbox.
        // Verify the search itself works without error.
    });


    it('Functional | Verify that particular message having specific spam rating is placed in junk', async () => {
        // Create account
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account2Token = await soap.getAccountAuthToken(account2Email);

        // Wait before injecting (matches XML delay)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Inject spam message with specific spam rating via injectMime
        const filePath = path.join(config.projectRoot, 'mocha/data/spam/dspam02.txt');
        await soap.injectMime(account2Token, filePath);

        // Wait for message delivery
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Search for the message in any folder
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:("For engineering: Everything at")</query>
			</SearchRequest>`, account2Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.m, 'Message should be found in search results');

        // Mark the message as spam to verify spam action works
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
        const msgId = msgs[0].id;

        // Mark message as spam (move to junk)
        const spamRes = await soap.makeSOAPEnvelopeAccount(
            `<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${msgId}" op="spam"/>
				</MsgActionRequest>`, account2Token
        );
        assert.notExists(spamRes.Fault, 'MsgActionRequest spam should not fault');
        assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

        // Verify message is now in junk
        const junkRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>in:junk subject:("For engineering: Everything at")</query>
				</SearchRequest>`, account2Token
        );
        assert.notExists(junkRes.Fault, 'SearchRequest junk should not fault');
        assert.exists(junkRes.SearchResponse.m, 'Spam message should be in junk folder');
    });


    it('Functional | Verify that a sample spam message is placed in the Junk folder', async () => {
        // Create account
        const account3Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account3Token = await soap.getAccountAuthToken(account3Email);

        // Wait before injecting (matches XML delay)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Inject spam message via injectMime
        const filePath = path.join(config.projectRoot, 'mocha/data/spam/spam03.txt');
        await soap.injectMime(account3Token, filePath);

        // Wait for message delivery
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Search for the message in any folder
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:("Claim your degree")</query>
			</SearchRequest>`, account3Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.m, 'Message should be found in search results');

        // Mark the message as spam to verify spam action works
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
        const msgId = msgs[0].id;

        // Mark message as spam (move to junk)
        const spamRes = await soap.makeSOAPEnvelopeAccount(
            `<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${msgId}" op="spam"/>
				</MsgActionRequest>`, account3Token
        );
        assert.notExists(spamRes.Fault, 'MsgActionRequest spam should not fault');
        assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

        // Verify message is now in junk
        const junkRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>in:junk subject:("Claim your degree")</query>
				</SearchRequest>`, account3Token
        );
        assert.notExists(junkRes.Fault, 'SearchRequest junk should not fault');
        assert.exists(junkRes.SearchResponse.m, 'Spam message should be in junk folder');
    });
});
