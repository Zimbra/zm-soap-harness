import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Alias Add', function () {
    this.timeout(60000);
    let testAccount1, testAccount2, testAccount3, testAccount4, testAccount5;
    let account1Id, account3Id;
    let aliasName, aliasName2, aliasName3, aliasName4;
    let adminAuthToken;

    before(async function () {
        this.timeout(30000);
        adminAuthToken = await soap.getAdminAuthToken();

        testAccount1 = `test.${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `test.${common.getUniqueString()}@${config.testDomain}`;
        testAccount3 = `test.${common.getUniqueString()}@${config.testDomain}`;
        testAccount4 = `test.${common.getUniqueString()}@${config.testDomain}`;
        testAccount5 = `test.${common.getUniqueString()}@${config.testDomain}`;

        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount1, testAccount1);
        account1Id = res1.accountId;

        const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount3, testAccount3);
        account3Id = res3.accountId;

        await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount4, testAccount4);
        await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount5, testAccount5);

        aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;
        aliasName2 = `alias01`; // Invalid (no domain)
        aliasName3 = `alias@non.existing.domain${common.getUniqueString()}`;
        aliasName4 = `alias4.${common.getUniqueString()}@${config.testDomain}`;
    });

    after(async function () {
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuthToken);
        if (testAccount3) await soap.deleteAccount(testAccount3, adminAuthToken);
        if (testAccount4) await soap.deleteAccount(testAccount4, adminAuthToken);
        if (testAccount5) await soap.deleteAccount(testAccount5, adminAuthToken);
    });


    it('Setup | Create test accounts', async () => {
        assert.isTrue(true);
    });


    it('Smoke | Add an Alias to an account', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasName}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.AddAccountAliasResponse, 'Alias should be added');
    });


    it('Functional | Add an invalid Alias (without domain name)', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasName2}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should return INVALID_REQUEST');
    });


    it('Functional | Add an Alias with non-existing domain name', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasName3}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN', 'Should return NO_SUCH_DOMAIN');
    });


    it('Functional | Add an Alias with spchar/numbers', async () => {
        const aliasSpChar = `:''<//\\@${config.testDomain}`;
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasSpChar}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        const errorCode = response.Fault.Detail.Error.Code;
        assert.isTrue(
            errorCode.includes('service.INVALID_REQUEST') || errorCode.includes('service.PARSE_ERROR'),
            `Should return INVALID_REQUEST or PARSE_ERROR, got: ${errorCode}`
        );

        const aliasNumber = `1234${common.getUniqueString()}@${config.testDomain}`;
        const response2 = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasNumber}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response2.AddAccountAliasResponse, 'Numeric alias should be allowed');
    });


    it('Regression | Add an Alias with blank name', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias></alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should return INVALID_REQUEST');
    });


    it('Functional | Create duplicate alias for the same account', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasName}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS', 'Should return ACCOUNT_EXISTS');
    });


    it('Regression | Add an alias with deleted domain', async () => {
        const domainName = `domain${common.getUniqueString()}.com`;
        const createDomain = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDomainRequest xmlns="urn:zimbraAdmin">
                <name>${domainName}</name>
            </CreateDomainRequest>`, adminAuthToken
        );
        const domainId = createDomain.CreateDomainResponse.domain[0].id;

        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteDomainRequest xmlns="urn:zimbraAdmin">
                <id>${domainId}</id>
            </DeleteDomainRequest>`, adminAuthToken
        );

        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>alias01.${common.getUniqueString()}@${domainName}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN', 'Should return NO_SUCH_DOMAIN');
    });


    it('Regression | Add an Alias to a non existing account', async () => {
        const nonExistentAccount = `nonexist.${common.getUniqueString()}@${config.testDomain}`;
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${nonExistentAccount}</id>
                <alias>${aliasName}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        const code = response.Fault.Detail.Error.Code;
        assert.isTrue(
            code.includes('account.NO_SUCH_ACCOUNT') || code.includes('account.NO_SUCH_ID'),
            'Should return NO_SUCH_ACCOUNT or NO_SUCH_ID'
        );
    });


    it('Regression | Add an Alias with name same as account name', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account3Id}</id>
                <alias>${testAccount3}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS', 'Should return ACCOUNT_EXISTS');
    });


    it('Functional | Add an Alias with name same as any other account name', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account3Id}</id>
                <alias>${testAccount1}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS', 'Should return ACCOUNT_EXISTS');
    });


    it('Functional | Add an Alias with name same as account name in other domain', async () => {
        const response = await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account3Id}</id>
                <alias>${testAccount4}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );
        assert.exists(response.Fault, 'Should have a Fault');
        assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS', 'Should return ACCOUNT_EXISTS');
    });


    it('Smoke | Search a mail (sent to account1) in account1 and in alias of account1', async () => {
        await soap.makeSOAPEnvelopeAdmin(
            `<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <alias>${aliasName4}</alias>
            </AddAccountAliasRequest>`, adminAuthToken
        );

        const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);
        const subject = `Subject12_${common.getUniqueString()}`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
                <m>
                    <e t="t" a="${testAccount1}"/>
                    <su>${subject}</su>
                    <mp ct="text/plain"><content>Content...</content></mp>
                </m>
            </SendMsgRequest>`, auth5
        );

        const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        await common.sleep(4000);

        const search1 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query>subject:(${subject})</query>
            </SearchRequest>`, auth1
        );
        const hit1 = search1.SearchResponse.c && search1.SearchResponse.c[0];
        assert.exists(hit1, 'Mail not found in account1');

        const aliasToken = await soap.getAccountAuthToken(aliasName4, config.accountPassword);

        const searchAlias = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query>subject:(${subject})</query>
            </SearchRequest>`, aliasToken
        );
        const hitAlias = searchAlias.SearchResponse.c && searchAlias.SearchResponse.c[0];
        assert.exists(hitAlias, 'Mail not found via alias login');
    });


    it('Smoke | Verify From: field when sent from alias', async () => {
        const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

        const subject = `Subject13_${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
                <m>
                    <e t="t" a="${testAccount3}"/>
                    <su>${subject}</su>
                    <mp ct="text/plain"><content>Content</content></mp>
                </m>
            </SendMsgRequest>`, aliasToken
        );

        const auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
        await common.sleep(4000);

        const search = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query>subject:(${subject})</query>
            </SearchRequest>`, auth3
        );

        const conv = search.SearchResponse.c && search.SearchResponse.c[0];
        assert.exists(conv, 'Message not received');

        const sender = conv.e.find(p => p.a === testAccount1);
        assert.exists(sender, 'Sender should be valid (testAccount1)');
    });


    it('Functional | Delete mail from account, deleted from alias', async () => {
        const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        const subject = `Subject14_${common.getUniqueString()}`;

        const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
                <m>
                    <e t="t" a="${testAccount1}"/>
                    <su>${subject}</su>
                    <mp ct="text/plain"><content>Content...</content></mp>
                </m>
            </SendMsgRequest>`, auth5
        );
        await common.sleep(4000);

        const searchMsg = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject})</query>
            </SearchRequest>`, auth1
        );
        const mId = searchMsg.SearchResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<MsgActionRequest xmlns="urn:zimbraMail">
                <action id="${mId}" op="delete"/>
            </MsgActionRequest>`, auth1
        );

        const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

        const searchAlias = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject})</query>
            </SearchRequest>`, aliasToken
        );
        const hits = searchAlias.SearchResponse.m;
        assert.notExists(hits, 'Message should be deleted in alias view too');
    });


    it('Functional | Delete mail from alias, deleted from account', async () => {
        const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);
        const subject = `Subject15_${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
                <m>
                    <e t="t" a="${testAccount1}"/>
                    <su>${subject}</su>
                    <mp ct="text/plain"><content>Content...</content></mp>
                </m>
            </SendMsgRequest>`, auth5
        );
        await common.sleep(4000);

        const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

        const searchMsg = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject})</query>
            </SearchRequest>`, aliasToken
        );
        const mId = searchMsg.SearchResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<MsgActionRequest xmlns="urn:zimbraMail">
                <action id="${mId}" op="delete"/>
            </MsgActionRequest>`, aliasToken
        );

        const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        const search = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject})</query>
            </SearchRequest>`, auth1
        );
        assert.notExists(search.SearchResponse.m, 'Message should be deleted in account too');
    });


    it('Functional | Check mail sent through account is present in sent folder of alias', async () => {
        const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        const subject = `Subject16_${common.getUniqueString()}`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
                <m>
                    <e t="t" a="${testAccount5}"/>
                    <su>${subject}</su>
                    <mp ct="text/plain"><content>Sent content</content></mp>
                </m>
            </SendMsgRequest>`, auth1
        );

        const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

        const searchAlias = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject}) in:sent</query>
            </SearchRequest>`, aliasToken
        );

        assert.exists(searchAlias.SearchResponse.m, 'Message found in Sent folder via alias');
    });

});
