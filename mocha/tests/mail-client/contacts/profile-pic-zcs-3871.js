import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Contacts > ProfilePic ZCS-3871', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	let account1Id;
	const uid = common.getUniqueString();
	const domainName = `zcs3871${uid}.com`;
	const galAccountName = `galaccount${uid}@${domainName}`;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create custom domain with GAL mode
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create GAL sync account
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${galAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const galAcct = Array.isArray(galRes.CreateAccountResponse?.account)
			? galRes.CreateAccountResponse.account[0] : galRes.CreateAccountResponse?.account;
		const galAcctId = galAcct?.id;

		// Get the mail host for the gal account
		const galAttrs = Array.isArray(galAcct?.a) ? galAcct.a : [galAcct?.a];
		const galHost = galAttrs.find(a => a?.n === 'zimbraMailHost');
		const galServer = galHost?._ || galHost;

		// Create GAL sync account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin"
				name="galname${uid}" type="zimbra" domain="${domainName}"
				server="${galServer}">
				<account by="id">${galAcctId}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);

		// Create test accounts in the domain
		account1Name = `user38711_${uid}@${domainName}`;
		account2Name = `user38712_${uid}@${domainName}`;

		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(acct1Res.CreateAccountResponse?.account)
			? acct1Res.CreateAccountResponse.account[0] : acct1Res.CreateAccountResponse?.account;
		account1Id = acct1?.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Set a profile pic for account and remove it', async () => {
		// Login as account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Upload a jpg profile image via ModifyProfileImageRequest with inline base64
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyProfileImageRequest xmlns="urn:zimbraMail">/9j/4AAQSkZJRgABAQAAAQABAAD/4gKgSUNDX1BST0ZJTEUAAQEAAAKQbGNtcwQwAABtbnRyUkdCIFhZWiAH3wALABcACwALABJhY3NwQVBQTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWxjbXMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtkZXNjAAABCAAAADhjcHJ0AAABQAAAAE53dHB0AAABkAAAABRjaGFkAAABpAAAACxyWFlaAAAB0AAAABRiWFlaAAAB5AAAABRnWFlaAAAB+AAAABRyVFJDAAACDAAAACBnVFJDAAACLAAAACBiVFJDAAACTAAAACBjaHJtAAACbAAAACRtbHVjAAAAAAAAAAEAAAAMZW5VUwAAABwAAAAcAHMAUgBHAEIAIABiAHUAaQBsAHQALQBpAG4AAG1sdWMAAAAAAAAAAQAAAAxlblVTAAAAMgAAABwATgBvACAAYwBvAHAAeQByAGkAZwBoAHQALAAgAHUAcwBlACAAZgByAGUAZQBsAHkAAAAAWFlaIAAAAAAAAPbWAAEAAAAA0y1zZjMyAAAAAAABDEoAAAXj///zKgAAB5sAAP2H///7ov///aMAAAPYAADAlFhZWiAAAAAAAABvlAAAOO4AAAOQWFlaIAAAAAAAACSdAAAPgwAAtr5YWVogAAAAAAAAYqUAALeQAAAY3nBhcmEAAAAAAAMAAAACZmYAAPKnAAANWQAAE9AAAApbcGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltwYXJhAAAAAAADAAAAAmZmAADypwAADVkAABPQAAAKW2Nocm0AAAAAAAMAAAAAo9cAAFR7AABMzQAAmZoAACZmAAAPXP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/bAEMBBQUFBwYHDggIDh4UERQeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHv/AABEIAQABAAMBIgACEQEDEQH/xAAcAAEAAgMBAQEAAAAAAAAAAAAABwgBAgYFBAP/xABPEAACAQMBAwMNCgsHBQEAAAAAAgMBBAUGBxESIjFCCBMXITI3QVJidJSy0hU2UVZhcXJzgsIUFiMkM1OBkqKzwUNjdZOhseIlNERk0fD/xAAaAQEAAwEBAQAAAAAAAAAAAAAABAUGAwIB/8QAKxEAAgIBAwMBCQEBAQAAAAAAAAIBAwQFERITMTIhFBUiMzRBUVJxI0Jh/9oADAMBAAIRAxEAPwC5YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA</ModifyProfileImageRequest>`, acct1Auth
		);
		assert.notExists(modRes.Fault, 'ModifyProfileImageRequest should not fault');
		const itemId1 = modRes.ModifyProfileImageResponse?.itemId;
		assert.exists(itemId1, 'itemId should be returned');

		// Verify profile pic id in GetInfo
		const getInfo1 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(getInfo1.Fault, 'GetInfoRequest should not fault');

		// Remove the profile image (empty request body)
		const removeRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyProfileImageRequest xmlns="urn:zimbraMail"></ModifyProfileImageRequest>`, acct1Auth
		);
		assert.notExists(removeRes.Fault, 'ModifyProfileImageRequest (remove) should not fault');

		// Verify profile pic id is removed in GetInfo
		const getInfo2 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(getInfo2.Fault, 'GetInfoRequest after remove should not fault');

		// Verify via admin GetAccountRequest
		const getAcct = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account1Id}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getAcct.Fault, 'GetAccountRequest should not fault');
		const acct = Array.isArray(getAcct.GetAccountResponse?.account)
			? getAcct.GetAccountResponse.account[0] : getAcct.GetAccountResponse?.account;
		assert.exists(acct, 'Account should exist in response');
		assert.equal(acct?.name, account1Name, 'Account name should match');

		// Verify via SyncGal from account2
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const syncGal = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount">
				<limit>10</limit>
			</SyncGalRequest>`, acct2Auth
		);
		assert.notExists(syncGal.Fault, 'SyncGalRequest should not fault');

		// Verify via SearchGal
		const searchGal = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount">
				<name>${account1Name}</name>
			</SearchGalRequest>`, acct2Auth
		);
		assert.notExists(searchGal.Fault, 'SearchGalRequest should not fault');
	});


	it('Sanity | Set a png profile pic after removing a profile pic', async () => {
		// Login as account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Upload jpg profile image via file upload
		const uploadJpg = await soap.uploadFile(
			acct1Auth, `${config.data}/zcs3871/image.jpg`
		);

		// Set profile image using uploaded file
		const modRes1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyProfileImageRequest xmlns="urn:zimbraMail"
				uid="${uploadJpg}"></ModifyProfileImageRequest>`, acct1Auth
		);
		assert.notExists(modRes1.Fault, 'ModifyProfileImageRequest (jpg) should not fault');
		const itemId2 = modRes1.ModifyProfileImageResponse?.itemId;
		assert.exists(itemId2, 'itemId should be returned for jpg');

		// Verify profile pic id in GetInfo
		const getInfo1 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(getInfo1.Fault, 'GetInfoRequest should not fault');

		// Remove the profile image
		const removeRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyProfileImageRequest xmlns="urn:zimbraMail"></ModifyProfileImageRequest>`, acct1Auth
		);
		assert.notExists(removeRes.Fault, 'ModifyProfileImageRequest (remove) should not fault');

		// Verify removal in GetInfo
		const getInfo2 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(getInfo2.Fault, 'GetInfoRequest after remove should not fault');

		// Upload png profile image
		const uploadPng = await soap.uploadFile(
			acct1Auth, `${config.data}/zcs3871/image.png`
		);

		// Set new png profile image
		const modRes2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyProfileImageRequest xmlns="urn:zimbraMail"
				uid="${uploadPng}"></ModifyProfileImageRequest>`, acct1Auth
		);
		assert.notExists(modRes2.Fault, 'ModifyProfileImageRequest (png) should not fault');
		const itemId4 = modRes2.ModifyProfileImageResponse?.itemId;
		assert.exists(itemId4, 'itemId should be returned for png');

		// Verify new png profile pic in GetInfo
		const getInfo3 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(getInfo3.Fault, 'GetInfoRequest for png should not fault');
	});
});
