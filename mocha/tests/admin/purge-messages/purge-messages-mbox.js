import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Purge Messages > Purge Messages Mbox', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    let domainName;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();

        // Create domain
        domainName = `testpurge${common.getUniqueString()}.com`;
        const domainRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
        );
        assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');
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

    // Helper to create account, add messages, set lifetime, and return account info
    async function createAccountWithMessages(emailPrefix, messageCount, lifetime) {
        const email = `${emailPrefix}.${common.getUniqueString()}@${domainName}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, `CreateAccountRequest should not fault for ${email}`);
        const acct = Array.isArray(createRes.CreateAccountResponse.account)
            ? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
        const id = acct.id;

        // Add messages via AddMsgRequest
        const token = await soap.getAccountAuthToken(email);
        for (let i = 0; i < messageCount; i++) {
            const subject = `purge0${String.fromCharCode(97 + i)}`;
            await soap.makeSOAPEnvelopeAccount(
                `<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender@example.com
To: ${email}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain

simple text string in the body</content>
					</m>
				</AddMsgRequest>`, token
            );
        }

        // Set purge lifetime
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${id}</id>
				<a n="zimbraMailMessageLifetime">${lifetime}</a>
				<a n="zimbraMailTrashLifetime">6d</a>
				<a n="zimbraMailSpamLifetime">6d</a>
			</ModifyAccountRequest>`, adminAuthToken
        );

        // Get mailbox ID
        const mboxRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${id}"/>
			</GetMailboxRequest>`, adminAuthToken
        );
        const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
            ? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;

        return { email, id, mbxid: mbox.mbxid, token };
    }

    // Tests
    it('Functional | Purge messages for a single account with an empty mailbox', async () => {
        const acct = await createAccountWithMessages('purge01', 0, '0');

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
        const mbox = Array.isArray(res.PurgeMessagesResponse.mbox)
            ? res.PurgeMessagesResponse.mbox[0] : res.PurgeMessagesResponse.mbox;
        assert.equal(mbox.mbxid, acct.mbxid, 'Returned mbxid should match');

        // Verify mailbox is still empty
        const mboxRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</GetMailboxRequest>`, adminAuthToken
        );
        assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
        const mboxAfter = Array.isArray(mboxRes.GetMailboxResponse.mbox)
            ? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
        assert.equal(mboxAfter.s, '0', 'Mailbox size should remain 0');
    });


    it('Functional | Purge messages for a single account with one message that is not purged', async () => {
        const acct = await createAccountWithMessages('purge02', 1, '0');

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
        const mbox = Array.isArray(res.PurgeMessagesResponse.mbox)
            ? res.PurgeMessagesResponse.mbox[0] : res.PurgeMessagesResponse.mbox;
        assert.equal(mbox.mbxid, acct.mbxid, 'Returned mbxid should match');

        // Verify message still exists
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.m, 'Message should still exist after purge');
    });


    it('Functional | Purge messages for account with messages in inbox, trash, and spam that are not purged', async () => {
        const acct = await createAccountWithMessages('purge03', 3, '0');

        // Move one message to trash (folder 3) and one to spam (folder 4)
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        if (msgs.length >= 3) {
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${msgs[0].id}" l="3"/>
				</MsgActionRequest>`, acct.token
            );
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${msgs[1].id}" l="4"/>
				</MsgActionRequest>`, acct.token
            );
        }

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
        const mbox = Array.isArray(res.PurgeMessagesResponse.mbox)
            ? res.PurgeMessagesResponse.mbox[0] : res.PurgeMessagesResponse.mbox;
        assert.equal(mbox.mbxid, acct.mbxid, 'Returned mbxid should match');

        // Verify all 3 messages still exist
        const token = await soap.getAccountAuthToken(acct.email);
        const searchAfter = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, token
        );
        assert.notExists(searchAfter.Fault, 'SearchRequest should not fault');
        const msgsAfter = Array.isArray(searchAfter.SearchResponse.m)
            ? searchAfter.SearchResponse.m : [searchAfter.SearchResponse.m];
        assert.equal(msgsAfter.length, 3, 'All 3 messages should still exist');
    });


    it('Functional | Purge messages for account with six messages and zimbraMailMessageLifetime 30d', async () => {
        const acct = await createAccountWithMessages('purge04', 6, '30d');

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
        const mbox = Array.isArray(res.PurgeMessagesResponse.mbox)
            ? res.PurgeMessagesResponse.mbox[0] : res.PurgeMessagesResponse.mbox;
        assert.equal(mbox.mbxid, acct.mbxid, 'Returned mbxid should match');
    });


    it('Functional | Purge messages for account with messages in trash and spam with lifetime 30d', async () => {
        const acct = await createAccountWithMessages('purge05', 6, '30d');

        // Move some to trash and spam
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        if (msgs.length >= 4) {
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${msgs[0].id}" l="3"/>
				</MsgActionRequest>`, acct.token
            );
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${msgs[1].id}" l="4"/>
				</MsgActionRequest>`, acct.token
            );
        }

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
    });


    it('Functional | Purge messages for account with messages only in trash and spam', async () => {
        const acct = await createAccountWithMessages('purge06', 3, '0');

        // Move all to trash
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        const msgs = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

        for (const msg of msgs) {
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${msg.id}" l="3"/>
				</MsgActionRequest>`, acct.token
            );
        }

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
    });


    it('Functional | Purge messages for a deleted account mailbox', async () => {
        const email = `purge07.${common.getUniqueString()}@${domainName}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        const acct = Array.isArray(createRes.CreateAccountResponse.account)
            ? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

        // Delete account
        const deleteRes = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
        );
        assert.notExists(deleteRes.Fault, 'DeleteAccountRequest should not fault');

        // Purge should fault
        const purgeRes = await soap.makeSOAPEnvelopeAdmin(
            `<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${acct.id}"/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
        );
        assert.exists(purgeRes.Fault, 'PurgeMessagesRequest should fault for deleted account');
        assert.include(purgeRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
    });
});
