import { assert } from 'chai';
import path from 'path';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Resolve Names ZCS 407', function () {
	this.timeout(180 * 1000);
	let adminAuthToken, account1Email, accountPassword;
	let firstnameContact1, lastnameContact1, firstnameAccount1, lastnameAccount1;
	let firstnameAccount2NotExists, contact1Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword || config.accountPassword;

		firstnameContact1 = `Firstname_contact1_${common.getUniqueString()}`;
		lastnameContact1 = `Lastname_contact1_${common.getUniqueString()}`;
		firstnameAccount1 = `Firstname_Account1_${common.getUniqueString()}`;
		lastnameAccount1 = `Lastname_Account1_${common.getUniqueString()}`;
		firstnameAccount2NotExists = `Firstname_Account2_${common.getUniqueString()}`;

		account1Email = `test1.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Sanity | Create a contact and sync using ResolveNames API in EWS All contact information should be returned', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const contactEmail = `email1.${common.getUniqueString()}@domain.com`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstnameContact1}</a>
					<a n="lastName">${lastnameContact1}</a>
					<a n="email">${contactEmail}</a>
					<a n="company">zimbra</a>
					<a n="workFax">6666</a>
					<a n="workPhone2">6666</a>
					<a n="callbackPhone">6666</a>
					<a n="carPhone">6666</a>
					<a n="homePhone2">6666</a>
					<a n="homeFax">6666</a>
					<a n="otherPhone">6666</a>
					<a n="otherFax">6666</a>
					<a n="email2">user2@persistent.co.in</a>
					<a n="middleName">s</a>
					<a n="jobTitle">QA</a>
					<a n="workPhone">66666</a>
					<a n="homePhone">66666</a>
					<a n="mobilePhone">6666</a>
					<a n="pager">666</a>
					<a n="email3">user3@persistent.co.in</a>
					<a n="workStreet">ttt</a>
					<a n="workCity">tt</a>
					<a n="workState">tt</a>
					<a n="workPostalCode">tt</a>
					<a n="workCountry">tt</a>
					<a n="workURL">tt</a>
					<a n="notes">Notes</a>
					<a n="imAddress1">xmpp://f</a>
					<a n="imAddress2">yahoo://v</a>
					<a n="imAddress4">yahoo://y</a>
					<a n="imAddress3">im://b</a>
					<a n="imAddress5">msn://m</a>
					<a n="birthday">2017-04-04</a>
					<a n="anniversary">2017-04-01</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		contact1Id = cn.id;
		assert.exists(contact1Id, 'Contact should have an id');
		const resolveRes = await ews.makeEWSRequest(
			`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>${firstnameContact1}</m:UnresolvedEntry>
			</m:ResolveNames>`,
			account1Email, accountPassword
		);
		const resolveBody = ews.getBody(resolveRes);
		const resolveMsg = resolveBody.ResolveNamesResponse
			.ResponseMessages.ResolveNamesResponseMessage;
		const msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;
		assert.equal(msg.$.ResponseClass, 'Success', 'ResolveNames should succeed');

		const resolution = Array.isArray(msg.ResolutionSet.Resolution)
			? msg.ResolutionSet.Resolution[0] : msg.ResolutionSet.Resolution;
		assert.equal(resolution.Mailbox.Name,
			`${firstnameContact1} s ${lastnameContact1}`, 'Name should match');
		assert.include(resolution.Mailbox.EmailAddress, 'email1',
			'EmailAddress should contain email1');

		const contact = resolution.Contact;
		assert.equal(contact.Body._, 'Notes', 'Body should be Notes');
		assert.equal(contact.CompleteName.FirstName, firstnameContact1,
			'FirstName should match');
		assert.equal(contact.CompleteName.LastName, lastnameContact1,
			'LastName should match');
		assert.equal(contact.CompleteName.MiddleName, 's',
			'MiddleName should match');
		assert.equal(contact.CompanyName, 'zimbra', 'CompanyName should match');

		const emailEntries = Array.isArray(contact.EmailAddresses.Entry)
			? contact.EmailAddresses.Entry : [contact.EmailAddresses.Entry];
		const email2Entry = emailEntries.find(e => e.$.Key === 'EmailAddress2');
		assert.include(email2Entry._, 'user2@persistent.co.in',
			'EmailAddress2 should match');
		const email3Entry = emailEntries.find(e => e.$.Key === 'EmailAddress3');
		assert.include(email3Entry._, 'user3@persistent.co.in',
			'EmailAddress3 should match');
		const email1Entry = emailEntries.find(e => e.$.Key === 'EmailAddress1');
		assert.include(email1Entry._, 'email1', 'EmailAddress1 should contain email1');

		const physAddr = contact.PhysicalAddresses;
		const addrEntry = Array.isArray(physAddr.Entry)
			? physAddr.Entry[0] : physAddr.Entry;
		assert.include(addrEntry.Street, 'ttt', 'Street should match');
		assert.include(addrEntry.City, 'tt', 'City should match');
		assert.include(addrEntry.State, 'tt', 'State should match');
		assert.include(addrEntry.CountryOrRegion, 'tt', 'Country should match');
		assert.include(addrEntry.PostalCode, 'tt', 'PostalCode should match');

		const phoneEntries = Array.isArray(contact.PhoneNumbers.Entry)
			? contact.PhoneNumbers.Entry : [contact.PhoneNumbers.Entry];
		const findPhone = (key) => phoneEntries.find(e => e.$.Key === key);
		assert.include(findPhone('Callback')._, '6666', 'Callback should match');
		assert.include(findPhone('CarPhone')._, '6666', 'CarPhone should match');
		assert.include(findPhone('Pager')._, '666', 'Pager should match');
		assert.include(findPhone('OtherFax')._, '6666', 'OtherFax should match');
		assert.include(findPhone('HomeFax')._, '6666', 'HomeFax should match');
		assert.include(findPhone('HomePhone')._, '6666', 'HomePhone should match');
		assert.include(findPhone('HomePhone2')._, '6666', 'HomePhone2 should match');
		assert.include(findPhone('BusinessFax')._, '6666', 'BusinessFax should match');
		assert.include(findPhone('MobilePhone')._, '6666', 'MobilePhone should match');
		assert.include(findPhone('OtherTelephone')._, '6666',
			'OtherTelephone should match');
		assert.include(findPhone('BusinessPhone2')._, '6666',
			'BusinessPhone2 should match');
		assert.include(findPhone('BusinessPhone')._, '6666',
			'BusinessPhone should match');

		assert.include(contact.Birthday, '2017-04-04', 'Birthday should match');
		assert.include(contact.BusinessHomePage, 'tt',
			'BusinessHomePage should match');

		const imEntries = Array.isArray(contact.ImAddresses.Entry)
			? contact.ImAddresses.Entry : [contact.ImAddresses.Entry];
		const findIm = (key) => imEntries.find(e => e.$.Key === key);
		assert.equal(findIm('ImAddress1')._, 'xmpp://f', 'ImAddress1 should match');
		assert.equal(findIm('ImAddress2')._, 'yahoo://v', 'ImAddress2 should match');
		assert.equal(findIm('ImAddress3')._, 'im://b', 'ImAddress3 should match');

		assert.equal(contact.JobTitle, 'QA', 'JobTitle should match');
		assert.include(contact.WeddingAnniversary, '2017-04-01',
			'WeddingAnniversary should match');
	});


	it('Sanity | Create a new account user and sync using ResolveNames API in EWS All contact information should be returned', async () => {
		const newAccountEmail = `${firstnameAccount1}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newAccountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${firstnameAccount1} ${lastnameAccount1}</a>
				<a n="givenName">${firstnameAccount1}</a>
				<a n="sn">${lastnameAccount1}</a>
				<a n="zimbraNotes">Zimbra notes</a>
				<a n="description">Description present</a>
				<a n="telephoneNumber">985865865</a>
				<a n="homePhone">234234223</a>
				<a n="mobile">994594848845</a>
				<a n="company">Zimbra</a>
				<a n="title">Dev</a>
				<a n="street">123 NewYork, Lincoln street, USA</a>
				<a n="l">lane</a>
				<a n="st">Newtown</a>
				<a n="postalCode">412123</a>
				<a n="co">USA</a>
				<a n="zimbraAttachmentsBlocked">TRUE</a>
				<a n="zimbraFeatureViewInHtmlEnabled">FALSE</a>
				<a n="zimbraAttachmentsViewInHtmlOnly">FALSE</a>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send sync gal request
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</SyncGalRequest>`, adminAuthToken
		);
		await soap.waitFor(10000);
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</SyncGalRequest>`, adminAuthToken
		);
		await soap.waitFor(5000);
		let msg;
		for (let attempt = 0; attempt < 5; attempt++) {
			if (attempt > 0) await soap.waitFor(10000);
			const resolveRes = await ews.makeEWSRequest(
				`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>${firstnameAccount1}</m:UnresolvedEntry>
			</m:ResolveNames>`,
				account1Email, accountPassword
			);
			const resolveBody = ews.getBody(resolveRes);
			const resolveMsg = resolveBody.ResolveNamesResponse
				.ResponseMessages.ResolveNamesResponseMessage;
			msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;
			if (msg.$.ResponseClass === 'Success') break;
		}

		// Verify response
		assert.equal(msg.$.ResponseClass, 'Success', 'ResolveNames should succeed');

		const resolution = Array.isArray(msg.ResolutionSet.Resolution)
			? msg.ResolutionSet.Resolution[0] : msg.ResolutionSet.Resolution;
		assert.equal(resolution.Mailbox.Name,
			`${firstnameAccount1} ${lastnameAccount1}`, 'Name should match');
		assert.include(resolution.Mailbox.EmailAddress.toLowerCase(), firstnameAccount1.toLowerCase(),
			'EmailAddress should contain account name');

		const contact = resolution.Contact;
		assert.equal(contact.Body._, 'Description present', 'Body should match');
		assert.equal(contact.CompleteName.FirstName, firstnameAccount1,
			'FirstName should match');
		assert.equal(contact.CompleteName.LastName, lastnameAccount1,
			'LastName should match');
		assert.equal(contact.CompanyName, 'Zimbra', 'CompanyName should match');

		const physAddr = contact.PhysicalAddresses;
		const addrEntry = Array.isArray(physAddr.Entry)
			? physAddr.Entry[0] : physAddr.Entry;
		assert.include(addrEntry.Street, '123 NewYork, Lincoln street, USA',
			'Street should match');
		assert.include(addrEntry.City, 'lane', 'City should match');
		assert.include(addrEntry.State, 'Newtown', 'State should match');
		assert.include(addrEntry.CountryOrRegion, 'USA', 'Country should match');
		assert.include(addrEntry.PostalCode, '412123', 'PostalCode should match');

		const phoneEntries = Array.isArray(contact.PhoneNumbers.Entry)
			? contact.PhoneNumbers.Entry : [contact.PhoneNumbers.Entry];
		const findPhone = (key) => phoneEntries.find(e => e.$.Key === key);
		assert.include(findPhone('HomePhone')._, '234234223',
			'HomePhone should match');
		assert.include(findPhone('BusinessPhone')._, '985865865',
			'BusinessPhone should match');
		assert.include(findPhone('MobilePhone')._, '994594848845',
			'MobilePhone should match');
		assert.equal(contact.JobTitle, 'Dev', 'JobTitle should match');
	});


	it('Sanity | Search for a contact using ResolveNames API in EWS which does not exist All contact information should be returned', async () => {
		const resolveRes = await ews.makeEWSRequest(
			`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>${firstnameAccount2NotExists}</m:UnresolvedEntry>
			</m:ResolveNames>`,
			account1Email, accountPassword
		);
		const resolveBody = ews.getBody(resolveRes);
		const resolveMsg = resolveBody.ResolveNamesResponse
			.ResponseMessages.ResolveNamesResponseMessage;
		const msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;

		// Verify response
		assert.include(msg.MessageText,
			`ResolveNames Failed to find a match: ${firstnameAccount2NotExists}`,
			'Should return not found message');
	});


	it('Sanity | Modify an existing contact on ZWC and sync the same in resolveNames API All modified contact information should be returned', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		// Modify the contact
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="0">
				<cn id="${contact1Id}">
					<a n="firstName">Modify_fname</a>
					<a n="lastName">Modify_lname</a>
					<a n="email">modify_email@${config.testDomain}</a>
					<a n="company">Synacor</a>
					<a n="workFax">99999999</a>
					<a n="workPhone2">8888888888</a>
					<a n="callbackPhone">2222222222</a>
					<a n="carPhone">3333333333</a>
					<a n="homePhone2">4444444444</a>
					<a n="homeFax">555555555</a>
					<a n="otherPhone">666666666666</a>
					<a n="otherFax">777777777777</a>
					<a n="email1">modify_email1@${config.testDomain}</a>
					<a n="email2">modify_email2@${config.testDomain}</a>
					<a n="email3">modify_email3@${config.testDomain}</a>
					<a n="middleName">Modify_mname</a>
					<a n="jobTitle">IT</a>
					<a n="workPhone">88888888889</a>
					<a n="mobilePhone">888888888831</a>
					<a n="pager">456456</a>
					<a n="workStreet">Street1</a>
					<a n="workCity">City1</a>
					<a n="workState">State1</a>
					<a n="workPostalCode">123123</a>
					<a n="workCountry">India</a>
					<a n="workURL">www.url.com</a>
					<a n="notes">Modified the contact</a>
					<a n="imAddress1">xmpp://a</a>
					<a n="imAddress2">yahoo://b</a>
					<a n="imAddress4">yahoo://c</a>
					<a n="imAddress3">im://d</a>
					<a n="imAddress5">msn://e</a>
					<a n="birthday">2017-04-20</a>
					<a n="anniversary">2017-04-30</a>
				</cn>
			</ModifyContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		assert.exists(modifyRes.ModifyContactResponse, 'ModifyContactResponse should exist');
		const resolveRes = await ews.makeEWSRequest(
			`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>Modify_fname</m:UnresolvedEntry>
			</m:ResolveNames>`,
			account1Email, accountPassword
		);
		const resolveBody = ews.getBody(resolveRes);
		const resolveMsg = resolveBody.ResolveNamesResponse
			.ResponseMessages.ResolveNamesResponseMessage;
		const msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;
		assert.equal(msg.$.ResponseClass, 'Success', 'ResolveNames should succeed');

		const resolution = Array.isArray(msg.ResolutionSet.Resolution)
			? msg.ResolutionSet.Resolution[0] : msg.ResolutionSet.Resolution;
		assert.equal(resolution.Mailbox.Name,
			'Modify_fname Modify_mname Modify_lname', 'Name should match');

		const contact = resolution.Contact;
		assert.equal(contact.Body._, 'Modified the contact', 'Body should match');
		assert.equal(contact.CompleteName.FirstName, 'Modify_fname',
			'FirstName should match');
		assert.equal(contact.CompleteName.LastName, 'Modify_lname',
			'LastName should match');
		assert.equal(contact.CompleteName.MiddleName, 'Modify_mname',
			'MiddleName should match');
		assert.equal(contact.CompanyName, 'Synacor', 'CompanyName should match');

		const emailEntries = Array.isArray(contact.EmailAddresses.Entry)
			? contact.EmailAddresses.Entry : [contact.EmailAddresses.Entry];
		const findEmail = (key) => emailEntries.find(e => e.$.Key === key);
		assert.include(findEmail('EmailAddress1')._,
			`modify_email@${config.testDomain}`, 'EmailAddress1 should match');
		assert.include(findEmail('EmailAddress2')._,
			`modify_email2@${config.testDomain}`, 'EmailAddress2 should match');
		assert.include(findEmail('EmailAddress3')._,
			`modify_email3@${config.testDomain}`, 'EmailAddress3 should match');

		const physAddr = contact.PhysicalAddresses;
		const addrEntry = Array.isArray(physAddr.Entry)
			? physAddr.Entry[0] : physAddr.Entry;
		assert.include(addrEntry.Street, 'Street1', 'Street should match');
		assert.include(addrEntry.City, 'City1', 'City should match');
		assert.include(addrEntry.State, 'State1', 'State should match');
		assert.include(addrEntry.CountryOrRegion, 'India', 'Country should match');
		assert.include(addrEntry.PostalCode, '123123', 'PostalCode should match');

		const phoneEntries = Array.isArray(contact.PhoneNumbers.Entry)
			? contact.PhoneNumbers.Entry : [contact.PhoneNumbers.Entry];
		const findPhone = (key) => phoneEntries.find(e => e.$.Key === key);
		assert.include(findPhone('Callback')._, '2222222222',
			'Callback should match');
		assert.include(findPhone('CarPhone')._, '3333333333',
			'CarPhone should match');
		assert.include(findPhone('Pager')._, '456456', 'Pager should match');
		assert.include(findPhone('OtherFax')._, '777777777777',
			'OtherFax should match');
		assert.include(findPhone('HomeFax')._, '555555555',
			'HomeFax should match');
		assert.include(findPhone('HomePhone')._, '66666',
			'HomePhone should match');
		assert.include(findPhone('HomePhone2')._, '4444444444',
			'HomePhone2 should match');
		assert.include(findPhone('BusinessFax')._, '99999999',
			'BusinessFax should match');
		assert.include(findPhone('MobilePhone')._, '888888888831',
			'MobilePhone should match');
		assert.include(findPhone('OtherTelephone')._, '666666666666',
			'OtherTelephone should match');
		assert.include(findPhone('BusinessPhone2')._, '8888888888',
			'BusinessPhone2 should match');
		assert.include(findPhone('BusinessPhone')._, '88888888889',
			'BusinessPhone should match');

		assert.include(contact.Birthday, '2017-04-20', 'Birthday should match');
		assert.include(contact.BusinessHomePage, 'www.url.com',
			'BusinessHomePage should match');

		const imEntries = Array.isArray(contact.ImAddresses.Entry)
			? contact.ImAddresses.Entry : [contact.ImAddresses.Entry];
		const findIm = (key) => imEntries.find(e => e.$.Key === key);
		assert.equal(findIm('ImAddress1')._, 'xmpp://a', 'ImAddress1 should match');
		assert.equal(findIm('ImAddress2')._, 'yahoo://b', 'ImAddress2 should match');
		assert.equal(findIm('ImAddress3')._, 'im://d', 'ImAddress3 should match');
		assert.equal(contact.JobTitle, 'IT', 'JobTitle should match');
		assert.include(contact.WeddingAnniversary, '2017-04-30',
			'WeddingAnniversary should match');
	});


	it('Sanity | Delete an existing contact on ZWC and sync the same in resolveNames API All modified contact information should be returned', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		// Send contact action request
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact1Id}" op="delete" />
			</ContactActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		assert.exists(deleteRes.ContactActionResponse,
			'ContactActionResponse should exist');
		const resolveRes = await ews.makeEWSRequest(
			`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>Modify_fname</m:UnresolvedEntry>
			</m:ResolveNames>`,
			account1Email, accountPassword
		);
		const resolveBody = ews.getBody(resolveRes);
		const resolveMsg = resolveBody.ResolveNamesResponse
			.ResponseMessages.ResolveNamesResponseMessage;
		const msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;
		assert.equal(msg.MessageText,
			'ResolveNames Failed to find a match: Modify_fname',
			'Should return not found message');
	});


	it('Sanity | Create a contact with image on ZWC and sync the same in resolveNames API All contact information should be returned', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const filePath = path.resolve('data/ews/image1.jpg');
		const imageAid = await soap.uploadFile(account1AuthToken, filePath);

		// Verify response
		assert.exists(imageAid, 'Upload should return attachment id');

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstnameContact1}</a>
					<a n="lastName">${lastnameContact1}</a>
					<a n="email">qwerty@${config.testDomain}</a>
					<a n="image" aid="${imageAid}" />
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactImageId = cn.id;
		assert.exists(contactImageId, 'Contact should have an id');
		const resolveRes = await ews.makeEWSRequest(
			`<m:ResolveNames
				xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				ReturnFullContactData="true" SearchScope="ActiveDirectory">
				<m:UnresolvedEntry>${firstnameContact1}</m:UnresolvedEntry>
			</m:ResolveNames>`,
			account1Email, accountPassword
		);
		const resolveBody = ews.getBody(resolveRes);
		const resolveMsg = resolveBody.ResolveNamesResponse
			.ResponseMessages.ResolveNamesResponseMessage;
		const msg = Array.isArray(resolveMsg) ? resolveMsg[0] : resolveMsg;
		assert.equal(msg.$.ResponseClass, 'Success', 'ResolveNames should succeed');

		const resolution = Array.isArray(msg.ResolutionSet.Resolution)
			? msg.ResolutionSet.Resolution[0] : msg.ResolutionSet.Resolution;
		assert.equal(resolution.Mailbox.Name,
			`${firstnameContact1} ${lastnameContact1}`, 'Name should match');
		assert.include(resolution.Mailbox.EmailAddress,
			`qwerty@${config.testDomain}`, 'EmailAddress should match');

		const contact = resolution.Contact;
		const fileAttach = contact.Attachments?.FileAttachment;
		const attach = Array.isArray(fileAttach) ? fileAttach[0] : fileAttach;
		assert.equal(attach.AttachmentId.$.Id, `${contactImageId}_image`,
			'AttachmentId should match');
		assert.equal(attach.Name, 'ContactPicture.jpg',
			'Attachment name should be ContactPicture.jpg');
		assert.equal(contact.CompleteName.FirstName, firstnameContact1,
			'FirstName should match');
		assert.equal(contact.CompleteName.LastName, lastnameContact1,
			'LastName should match');

		const emailEntries = Array.isArray(contact.EmailAddresses.Entry)
			? contact.EmailAddresses.Entry : [contact.EmailAddresses.Entry];
		const email1Entry = emailEntries.find(e => e.$.Key === 'EmailAddress1');
		assert.include(email1Entry._, `qwerty@${config.testDomain}`,
			'EmailAddress1 should match');
	});
});
