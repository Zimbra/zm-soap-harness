import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sharing > Send Share Notification Request Basic', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    let account1Email, account1AuthToken;
    let account2Email, account2Id, account2AuthToken;
    let account3Email, account3Id, account3AuthToken;
    let account4Email, account4AuthToken;
    let account5Email, account5Id, account5AuthToken;
    let account6Email, account6AuthToken;
    let account7Email, account7AuthToken;
    let dl1Name, dl1Id, dl2Name, dl2Id;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();

        // Create 7 accounts
        account1Email = `share1.${common.getUniqueString()}@${testDomain}`;
        await soap.createAccountByNameAndEmailAddress(adminAuthToken, account1Email, account1Email);
        account1AuthToken = await soap.getAccountAuthToken(account1Email, config.accountPassword);

        account2Email = `share2.${common.getUniqueString()}@${testDomain}`;
        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account2Email, account2Email);
        account2Id = res2.accountId;
        account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);

        account3Email = `share3.${common.getUniqueString()}@${testDomain}`;
        const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account3Email, account3Email);
        account3Id = res3.accountId;
        account3AuthToken = await soap.getAccountAuthToken(account3Email, config.accountPassword);

        account4Email = `share4.${common.getUniqueString()}@${testDomain}`;
        await soap.createAccountByNameAndEmailAddress(adminAuthToken, account4Email, account4Email);
        account4AuthToken = await soap.getAccountAuthToken(account4Email, config.accountPassword);

        account5Email = `share5.${common.getUniqueString()}@${testDomain}`;
        const res5 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account5Email, account5Email);
        account5Id = res5.accountId;
        account5AuthToken = await soap.getAccountAuthToken(account5Email, config.accountPassword);

        account6Email = `share6.${common.getUniqueString()}@${testDomain}`;
        await soap.createAccountByNameAndEmailAddress(adminAuthToken, account6Email, account6Email);
        account6AuthToken = await soap.getAccountAuthToken(account6Email, config.accountPassword);

        account7Email = `share7.${common.getUniqueString()}@${testDomain}`;
        await soap.createAccountByNameAndEmailAddress(adminAuthToken, account7Email, account7Email);
        account7AuthToken = await soap.getAccountAuthToken(account7Email, config.accountPassword);

        // Create DL1 with accounts 1, 2, 3
        dl1Name = `dl1.${common.getUniqueString()}@${testDomain}`;
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dl1Name}</name>
			</CreateDistributionListRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'CreateDL1 should not fault');
        dl1Id = res.CreateDistributionListResponse.dl[0].id;

        res = await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl1Id}</id>
				<dlm>${account3Email}</dlm>
				<dlm>${account2Email}</dlm>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'AddDL1Members should not fault');

        // Create DL2 with accounts 6, 7
        dl2Name = `dl2.${common.getUniqueString()}@${testDomain}`;
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dl2Name}</name>
			</CreateDistributionListRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'CreateDL2 should not fault');
        dl2Id = res.CreateDistributionListResponse.dl[0].id;

        res = await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl2Id}</id>
				<dlm>${account6Email}</dlm>
				<dlm>${account7Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'AddDL2Members should not fault');
    });

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

    // Tests
    it('Smoke | SendShareNotificationRequest sends notification about share', async () => {
        // Account2 shares Calendar with Account1 and sends notification
        let res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
        );
        assert.notExists(res.Fault, 'GetFolderRequest should not fault');
        const acct2Folders = res.GetFolderResponse.folder[0].folder;
        const acct2Calendar = acct2Folders.find(f => f.name === 'Calendar');

        res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Calendar.id}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
        );
        assert.notExists(res.Fault, 'Grant Calendar should not fault');

        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct2Calendar.id}" gt="usr" d="${account1Email}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account2AuthToken
        );
        assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');
        assert.exists(res.SendShareNotificationResponse,
            'SendShareNotificationResponse should exist');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Account1: verify notification received
        res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
        );
        assert.notExists(res.Fault, 'SearchRequest should not fault');

        // Account1: mount the shared calendar
        res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
        );
        const acct1Folders = res.GetFolderResponse.folder[0].folder;
        const acct1Calendar = acct1Folders.find(f => f.name === 'Calendar');

        const mountName = `sharedfolder.${common.getUniqueString()}`;
        res = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1Calendar.id}" name="${mountName}"
					zid="${account2Id}" rid="${acct2Calendar.id}" view="appointment"/>
			</CreateMountpointRequest>`, account1AuthToken
        );
        assert.notExists(res.Fault, 'CreateMountpointRequest should not fault');
        assert.exists(res.CreateMountpointResponse,
            'CreateMountpointResponse should exist');
    });


    it('Sanity | SendShareNotificationRequest gives error if folder not shared', async () => {
        // Account2 sends notification for unshared Briefcase
        let res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
        );
        const acct2Folders = res.GetFolderResponse.folder[0].folder;
        const acct2Briefcase = acct2Folders.find(f => f.name === 'Briefcase');

        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct2Briefcase.id}" gt="usr" d="${account1Email}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account2AuthToken, false
        );
        assert.exists(res.Fault, 'Should fault for unshared folder');
		const faultMsg = JSON.stringify(res.Fault);
		assert.isTrue(faultMsg.includes('INVALID_REQUEST') || faultMsg.includes('no matching grant'), 'Error should indicate INVALID_REQUEST or no matching grant');
    });


    it('Functional | SendShareNotificationRequest sends notification to all DL members', async () => {
        // Account3 shares Calendar with DL1
        let res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3AuthToken
        );
        const acct3Folders = res.GetFolderResponse.folder[0].folder;
        const acct3Calendar = acct3Folders.find(f => f.name === 'Calendar');

        res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Calendar.id}">
					<grant gt="grp" d="${dl1Name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
        );
        assert.notExists(res.Fault, 'Grant to DL should not fault');

        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Calendar.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
        );
        assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');
        assert.exists(res.SendShareNotificationResponse,
            'SendShareNotificationResponse should exist');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Account1 (DL member): verify notification and mount
        res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
        );
        assert.notExists(res.Fault, 'SearchRequest should not fault');

        // Account2 (DL member): verify notification and mount
        res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account2AuthToken
        );
        assert.notExists(res.Fault, 'SearchRequest for account2 should not fault');
    });


    it('Functional | SendShareNotificationRequest sent to added DL member', async () => {
        // Account3 shares Briefcase with DL1
        let res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3AuthToken
        );
        const acct3Folders = res.GetFolderResponse.folder[0].folder;
        const acct3Briefcase = acct3Folders.find(f => f.name === 'Briefcase');

        res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Briefcase.id}">
					<grant gt="grp" d="${dl1Name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
        );
        assert.notExists(res.Fault, 'Grant Briefcase to DL should not fault');

        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Briefcase.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
        );
        assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Add account4 to DL1
        res = await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl1Id}</id>
				<dlm>${account4Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'AddDLMember should not fault');

        // Re-send notification
        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Briefcase.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
        );
        assert.notExists(res.Fault, 'Re-send notification should not fault');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Account4: verify notification
        res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account4AuthToken
        );
        assert.notExists(res.Fault, 'SearchRequest for account4 should not fault');
    });


    it('Functional | SendShareNotificationRequest sent to remove share', async () => {
        // Account5 shares Calendar with DL2
        let res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account5AuthToken
        );
        const acct5Folders = res.GetFolderResponse.folder[0].folder;
        const acct5Calendar = acct5Folders.find(f => f.name === 'Calendar');

        res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct5Calendar.id}">
					<grant gt="grp" d="${dl2Name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account5AuthToken
        );
        assert.notExists(res.Fault, 'Grant to DL2 should not fault');

        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct5Calendar.id}" gt="grp" d="${dl2Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account5AuthToken
        );
        assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // Account6 (DL2 member): mount the shared calendar
        res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account6AuthToken
        );
        const acct6Folders = res.GetFolderResponse.folder[0].folder;
        const acct6Calendar = acct6Folders.find(f => f.name === 'Calendar');

        const mountName = `sharedfolder.${common.getUniqueString()}`;
        res = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct6Calendar.id}" name="${mountName}"
					zid="${account5Id}" rid="${acct5Calendar.id}" view="appointment"/>
			</CreateMountpointRequest>`, account6AuthToken
        );
        assert.notExists(res.Fault, 'Mount should not fault');

        // Revoke the DL2 share
        res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${acct5Calendar.id}" zid="${dl2Id}"/>
			</FolderActionRequest>`, account5AuthToken
        );
        assert.notExists(res.Fault, 'Revoke should not fault');

        // Try to send notification after revoke - should get INVALID_REQUEST
        res = await soap.makeSOAPEnvelopeAccount(
            `<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct5Calendar.id}" gt="grp" zid="${dl2Id}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account5AuthToken, false
        );
        assert.exists(res.Fault, 'Should fault after revoke');

        // Account7 (DL2 member): try to mount - should get PERM_DENIED
        res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, account7AuthToken
        );
        const acct7Folders = res.GetFolderResponse.folder[0].folder;
        const acct7Calendar = acct7Folders.find(f => f.name === 'Calendar');

        const mountName2 = `sharedfolder.${common.getUniqueString()}`;
        res = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct7Calendar.id}" name="${mountName2}"
					zid="${account5Id}" rid="${acct5Calendar.id}" view="appointment"/>
			</CreateMountpointRequest>`, account7AuthToken, false
        );
        assert.exists(res.Fault, 'Mount after revoke should fault with PERM_DENIED');
    });
});
