import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Contact Sync', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword, contactFolderId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		contactFolderId = '7';

		accountEmail = `ewscontact${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
	it('Sanity | Create a contact on ZWC and sync on EWS client 1', async () => {
		const contact1Fname = `First1${common.getUniqueString()}`;
		const contact1Lname = `Last1${common.getUniqueString()}`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact1Fname}</a>
					<a n="lastName">${contact1Lname}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');

		// EWS: SyncFolderItems to get the contact
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const contactItemId = creates[0].Contact.ItemId.$.Id;
		const contactChangeKey = creates[0].Contact.ItemId.$.ChangeKey;

		// EWS: GetItem to verify contact details
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties />
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${contactItemId}" ChangeKey="${contactChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Contact.CompleteName.FirstName, contact1Fname,
			'FirstName should match');
		assert.equal(itemMsg.Items.Contact.CompleteName.LastName, contact1Lname,
			'LastName should match');
	});


	it('Sanity | Create a contact on ZWC and sync on EWS client 2', async () => {
		const contact2Fname = `First2${common.getUniqueString()}`;
		const contact2Lname = `Last2${common.getUniqueString()}`;
		const contact2Email = `email2${common.getUniqueString()}@foo.com`;
		const contact2Job = `qa2${common.getUniqueString()}`;
		const contact2Company = `Synacor2${common.getUniqueString()}`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact2Fname}</a>
					<a n="lastName">${contact2Lname}</a>
					<a n="email">${contact2Email}</a>
					<a n="jobTitle">${contact2Job}</a>
					<a n="company">${contact2Company}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');

		// EWS: SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const contactItemId = lastCreate.Contact.ItemId.$.Id;
		const contactChangeKey = lastCreate.Contact.ItemId.$.ChangeKey;

		// EWS: GetItem to verify contact details
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="contacts:JobTitle" />
						<t:FieldURI FieldURI="contacts:CompanyName" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${contactItemId}" ChangeKey="${contactChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Contact.CompleteName.FirstName, contact2Fname,
			'FirstName should match');
		assert.equal(itemMsg.Items.Contact.CompleteName.LastName, contact2Lname,
			'LastName should match');
		assert.equal(itemMsg.Items.Contact.JobTitle, contact2Job,
			'JobTitle should match');
		assert.equal(itemMsg.Items.Contact.CompanyName, contact2Company,
			'CompanyName should match');
	});


	it('Sanity | Create a contact on ZWC and sync on EWS client 3', async () => {
		const contact3Fname = `First3${common.getUniqueString()}`;
		const contact3Lname = `Last3${common.getUniqueString()}`;
		const contact3Email1 = `email3${common.getUniqueString()}@foo.com`;
		const contact3Email2 = `email4${common.getUniqueString()}@foo.com`;
		const contact3Email3 = `email5${common.getUniqueString()}@foo.com`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact3Fname}</a>
					<a n="lastName">${contact3Lname}</a>
					<a n="email">${contact3Email1}</a>
					<a n="email2">${contact3Email2}</a>
					<a n="email3">${contact3Email3}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');

		// EWS: SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const contactItemId = lastCreate.Contact.ItemId.$.Id;
		const contactChangeKey = lastCreate.Contact.ItemId.$.ChangeKey;

		// EWS: GetItem to verify multiple email addresses
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties />
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${contactItemId}" ChangeKey="${contactChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Contact.CompleteName.FirstName, contact3Fname,
			'FirstName should match');
		assert.equal(itemMsg.Items.Contact.CompleteName.LastName, contact3Lname,
			'LastName should match');
		const emailEntries = Array.isArray(itemMsg.Items.Contact.EmailAddresses.Entry)
			? itemMsg.Items.Contact.EmailAddresses.Entry
			: [itemMsg.Items.Contact.EmailAddresses.Entry];
		assert.equal(emailEntries[0]._, contact3Email1, 'Email1 should match');
		assert.equal(emailEntries[1]._, contact3Email2, 'Email2 should match');
		assert.equal(emailEntries[2]._, contact3Email3, 'Email3 should match');
	});


	it('Sanity | Edit a contact on ZWC and sync on EWS client', async () => {
		const contact3Fname = `First3${common.getUniqueString()}`;
		const contact3Lname = `Last3${common.getUniqueString()}`;
		const contact3Email1 = `email3${common.getUniqueString()}@foo.com`;
		const contact3Email2 = `email4${common.getUniqueString()}@foo.com`;
		const contact3Email3 = `email5${common.getUniqueString()}@foo.com`;
		const contact3Phone = '9685749045';

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact3Fname}</a>
					<a n="lastName">${contact3Lname}</a>
					<a n="email">${contact3Email1}</a>
					<a n="email2">${contact3Email2}</a>
					<a n="email3">${contact3Email3}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contact3Id = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0].id
			: createRes.CreateContactResponse.cn.id;

		// Modify contact - add address and phone
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${contact3Id}">
					<a n="workStreet">abc</a>
					<a n="workCity">def</a>
					<a n="workState">NY</a>
					<a n="workPostalCode">123123</a>
					<a n="workCountry">US</a>
					<a n="workPhone">${contact3Phone}</a>
				</cn>
			</ModifyContactRequest>`, accountAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyContact should not be a Fault');

		// EWS: SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const allChanges = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastChange = allChanges[allChanges.length - 1];
		const contactItemId = lastChange.Contact.ItemId.$.Id;
		const contactChangeKey = lastChange.Contact.ItemId.$.ChangeKey;

		// EWS: GetItem to verify edited contact
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties />
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${contactItemId}" ChangeKey="${contactChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Contact.CompleteName.FirstName, contact3Fname,
			'FirstName should match');
		assert.equal(itemMsg.Items.Contact.CompleteName.LastName, contact3Lname,
			'LastName should match');
		const emailEntries = Array.isArray(itemMsg.Items.Contact.EmailAddresses.Entry)
			? itemMsg.Items.Contact.EmailAddresses.Entry
			: [itemMsg.Items.Contact.EmailAddresses.Entry];
		assert.equal(emailEntries[0]._, contact3Email1, 'Email1 should match');
		assert.equal(emailEntries[1]._, contact3Email2, 'Email2 should match');
		assert.equal(emailEntries[2]._, contact3Email3, 'Email3 should match');
		const address = itemMsg.Items.Contact.PhysicalAddresses?.Entry;
		const addrEntry = Array.isArray(address) ? address[0] : address;
		assert.equal(addrEntry.Street, 'abc', 'Street should match');
		assert.equal(addrEntry.City, 'def', 'City should match');
		assert.equal(addrEntry.State, 'NY', 'State should match');
		assert.equal(addrEntry.CountryOrRegion, 'US', 'Country should match');
		assert.equal(addrEntry.PostalCode, '123123', 'PostalCode should match');
		const phoneEntries = Array.isArray(itemMsg.Items.Contact.PhoneNumbers.Entry)
			? itemMsg.Items.Contact.PhoneNumbers.Entry
			: [itemMsg.Items.Contact.PhoneNumbers.Entry];
		const workPhone = phoneEntries.find(e => e.$.Key === 'BusinessPhone'
			|| e.$.Key === 'BusinessPhone2' || e._ === contact3Phone);
		assert.exists(workPhone, 'Work phone should exist');
		assert.equal(workPhone._, contact3Phone, 'Phone number should match');
	});


	it('Sanity | Create a new contact from EWS client and sync on ZWC', async () => {
		const contact4Fname = `First4${common.getUniqueString()}`;
		const contact4Lname = `Last4${common.getUniqueString()}`;
		const contact4Job = `qa3${common.getUniqueString()}`;

		// EWS: CreateItem contact
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SavedItemFolderId>
				<Items>
					<t:Contact>
						<t:Subject>${contact4Fname} ${contact4Lname}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:FileAsMapping>FirstSpaceLast</t:FileAsMapping>
						<t:DisplayName>${contact4Fname} ${contact4Lname}</t:DisplayName>
						<t:GivenName>${contact4Fname}</t:GivenName>
						<t:JobTitle>${contact4Job}</t:JobTitle>
						<t:Surname>${contact4Lname}</t:Surname>
					</t:Contact>
				</Items>
			</CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(5000);

		// Verify on ZWC: Search for the contact
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:contacts</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const cnArray = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		const found = cnArray.find(c => c.fileAsStr
			&& c.fileAsStr.includes(`${contact4Fname} ${contact4Lname}`));
		assert.exists(found, 'Contact should be found in ZWC search');

		// GetContacts to verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${found.id}" />
			</GetContactsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetContactsResponse.cn, 'Contact should exist');
	});


	it('Sanity | Edit an existing contact from EWS client and sync on ZWC', async () => {
		const contact3Fname = `First3${common.getUniqueString()}`;
		const contact3Lname = `Last3${common.getUniqueString()}`;
		const contact3Email1 = `email3${common.getUniqueString()}@foo.com`;
		const contact3PhoneEws = '45959495495';

		// Create a contact via Zimbra SOAP first
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact3Fname}</a>
					<a n="lastName">${contact3Lname}</a>
					<a n="email">${contact3Email1}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		// EWS: SyncFolderItems to get the contact ID
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const cont03Id = lastCreate.Contact.ItemId.$.Id;
		const cont03ChangeKey = lastCreate.Contact.ItemId.$.ChangeKey;

		// EWS: UpdateItem to add mobile phone
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${cont03Id}" ChangeKey="${cont03ChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:IndexedFieldURI FieldURI="contacts:PhoneNumber"
									FieldIndex="MobilePhone" />
								<t:Contact>
									<t:PhoneNumbers>
										<t:Entry Key="MobilePhone">${contact3PhoneEws}</t:Entry>
									</t:PhoneNumbers>
								</t:Contact>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			accountEmail, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success',
			'UpdateItem should succeed');

		await soap.waitFor(5000);

		// Verify on ZWC: Search for the contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:contacts</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const cnArray = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		const found = cnArray.find(c => c.fileAsStr
			&& c.fileAsStr.includes(`${contact3Lname}, ${contact3Fname}`));
		assert.exists(found, 'Contact should be found in ZWC search');

		// GetContacts to verify mobile phone synced
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" returnAllAttrs="1">
				<cn id="${found.id}" />
			</GetContactsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const mobilePhone = cn._attrs?.mobilePhone || cn.a?.find?.(a => a && a.n === 'mobilePhone')?._content;
		assert.exists(mobilePhone, 'mobilePhone attribute should exist');
		assert.equal(mobilePhone, contact3PhoneEws,
			'Mobile phone number should match');
	});


	it('Sanity | Delete a contact from ZWC client and sync on EWS', async () => {
		const contact3Fname = `First3${common.getUniqueString()}`;
		const contact3Lname = `Last3${common.getUniqueString()}`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact3Fname}</a>
					<a n="lastName">${contact3Lname}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contact3Id = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0].id
			: createRes.CreateContactResponse.cn.id;

		// EWS: SyncFolderItems to get SyncState before delete
		const syncRes1 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody1 = ews.getBody(syncRes1);
		const syncMsg1 = syncBody1.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage1 = Array.isArray(syncMsg1) ? syncMsg1[0] : syncMsg1;
		assert.equal(syncMessage1.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const syncState = syncMessage1.SyncState;
		const creates = Array.isArray(syncMessage1.Changes.Create)
			? syncMessage1.Changes.Create : [syncMessage1.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const cont03Id = lastCreate.Contact.ItemId.$.Id;

		// Delete contact on ZWC
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact3Id}" op="delete" />
			</ContactActionRequest>`, accountAuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		// EWS: SyncFolderItems with SyncState to see delete
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const deleteChange = syncMessage2.Changes.Delete;
		const deleteItem = Array.isArray(deleteChange)
			? deleteChange.find(d => d.ItemId.$.Id === cont03Id)
			: deleteChange;
		assert.exists(deleteItem, 'Delete change should exist');
		assert.equal(deleteItem.ItemId.$.Id, cont03Id,
			'Deleted item ID should match');
	});


	it('Sanity | Delete a contact from EWS client and sync on ZWC', async () => {
		const contact2Fname = `First2${common.getUniqueString()}`;
		const contact2Lname = `Last2${common.getUniqueString()}`;
		const contact2Email = `email2${common.getUniqueString()}@foo.com`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact2Fname}</a>
					<a n="lastName">${contact2Lname}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		// EWS: SyncFolderItems to get the item ID
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const cont02Id = lastCreate.Contact.ItemId.$.Id;

		// EWS: DeleteItem
		const deleteRes = await ews.makeEWSRequest(
			`<DeleteItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				DeleteType="SoftDelete">
				<ItemIds>
					<t:ItemId Id="${cont02Id}" />
				</ItemIds>
			</DeleteItem>`,
			accountEmail, accountPassword
		);
		const deleteBody = ews.getBody(deleteRes);
		const deleteMsg = deleteBody.DeleteItemResponse
			?.ResponseMessages?.DeleteItemResponseMessage;
		if (deleteMsg) {
			const deleteMessage = Array.isArray(deleteMsg) ? deleteMsg[0] : deleteMsg;
			assert.equal(deleteMessage.$.ResponseClass, 'Success',
				'DeleteItem should succeed');
		} else {
			// DeleteItemResponse exists without detailed ResponseMessages
			assert.exists(deleteBody.DeleteItemResponse, 'DeleteItemResponse should exist');
		}

		await soap.waitFor(5000);

		// Verify on ZWC: contact should not be found
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:contacts</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		if (searchRes.SearchResponse.cn) {
			const cnArray = Array.isArray(searchRes.SearchResponse.cn)
				? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
			const found = cnArray.find(c => c.fileAsStr
				&& c.fileAsStr.includes(`${contact2Lname}, ${contact2Fname}`));
			assert.notExists(found,
				'Deleted contact should not be found in ZWC search');
		}
	});


	it('Sanity | Move a contact from one folder to other on ZWC', async () => {
		const contact1Fname = `First1${common.getUniqueString()}`;
		const contact1Lname = `Last1${common.getUniqueString()}`;
		const folderName = `folder${common.getUniqueString()}`;

		// Create contact via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact1Fname}</a>
					<a n="lastName">${contact1Lname}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contact1Id = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0].id
			: createRes.CreateContactResponse.cn.id;

		// Create a folder under contacts
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="7" />
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folderId = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0].id
			: folderRes.CreateFolderResponse.folder.id;

		// Move contact to new folder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact1Id}" op="move" l="${folderId}" />
			</ContactActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// EWS: SyncFolderItems on contacts folder - verify success
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${contactFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on contacts should succeed');

		// EWS: SyncFolderItems on new folder - verify success
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${folderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems on new folder should succeed');
	});
});
