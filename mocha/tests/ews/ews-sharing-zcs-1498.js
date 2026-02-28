import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > EWS Sharing ZCS-1498', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = 'test123';

		account1Email = `ewsshare1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsshare2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsshare3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Getting DisplayName of user in GetFolderResponse once the share is created', async () => {
		// EWS: GetFolder inbox with PermissionSet
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:PermissionSet" />
					</t:AdditionalProperties>
				</FolderShape>
				<FolderIds>
					<t:FolderId Id="2" />
				</FolderIds>
			</GetFolder>`,
			account1Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const folderId = folderMsg.Folders.Folder.FolderId.$.Id;
		const changeKey = folderMsg.Folders.Folder.FolderId.$.ChangeKey;

		// EWS: UpdateFolder to add sharing permission for account2
		const updateRes = await ews.makeEWSRequest(
			`<UpdateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderChanges>
					<t:FolderChange>
						<t:FolderId Id="${folderId}" ChangeKey="${changeKey}" />
						<t:Updates>
							<t:SetFolderField>
								<t:FieldURI FieldURI="folder:PermissionSet" />
								<t:Folder>
									<t:PermissionSet>
										<t:Permissions>
											<t:Permission>
												<t:UserId>
													<t:PrimarySmtpAddress>${account2Email}</t:PrimarySmtpAddress>
													<t:DisplayName>${account2Email}</t:DisplayName>
												</t:UserId>
												<t:PermissionLevel>Owner</t:PermissionLevel>
											</t:Permission>
										</t:Permissions>
									</t:PermissionSet>
								</t:Folder>
							</t:SetFolderField>
						</t:Updates>
					</t:FolderChange>
				</FolderChanges>
			</UpdateFolder>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateFolderId = updateBody.UpdateFolderResponse
			.ResponseMessages.UpdateFolderResponseMessage;
		const updateMsg = Array.isArray(updateFolderId) ? updateFolderId[0] : updateFolderId;
		assert.exists(updateMsg.Folders.Folder.FolderId.$.Id,
			'UpdateFolder should return folder Id');

		// EWS: GetFolder again to verify DisplayName is present
		const getFolder2Res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:PermissionSet" />
					</t:AdditionalProperties>
				</FolderShape>
				<FolderIds>
					<t:FolderId Id="2" />
				</FolderIds>
			</GetFolder>`,
			account1Email, accountPassword
		);
		const getFolder2Body = ews.getBody(getFolder2Res);
		const getFolder2Msg = getFolder2Body.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folder2Msg = Array.isArray(getFolder2Msg) ? getFolder2Msg[0] : getFolder2Msg;
		assert.equal(folder2Msg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const permissions = folder2Msg.Folders.Folder.PermissionSet.Permissions.Permission;
		const permArray = Array.isArray(permissions) ? permissions : [permissions];
		const account2Perm = permArray.find(p => p.UserId?.DisplayName === account2Email);
		assert.exists(account2Perm, 'DisplayName of shared user should be present');
	});


	it('Sanity | Getting DisplayName of multiple users in GetFolderResponse once the share is created', async () => {
		// EWS: GetFolder sent items with PermissionSet
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:PermissionSet" />
					</t:AdditionalProperties>
				</FolderShape>
				<FolderIds>
					<t:FolderId Id="5" />
				</FolderIds>
			</GetFolder>`,
			account1Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const folderId = folderMsg.Folders.Folder.FolderId.$.Id;
		const changeKey = folderMsg.Folders.Folder.FolderId.$.ChangeKey;

		// EWS: UpdateFolder to add sharing permissions for account2 and account3
		const updateRes = await ews.makeEWSRequest(
			`<UpdateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderChanges>
					<t:FolderChange>
						<t:FolderId Id="${folderId}" ChangeKey="${changeKey}" />
						<t:Updates>
							<t:SetFolderField>
								<t:FieldURI FieldURI="folder:PermissionSet" />
								<t:Folder>
									<t:PermissionSet>
										<t:Permissions>
											<t:Permission>
												<t:UserId>
													<t:PrimarySmtpAddress>${account2Email}</t:PrimarySmtpAddress>
													<t:DisplayName>${account2Email}</t:DisplayName>
												</t:UserId>
												<t:PermissionLevel>Owner</t:PermissionLevel>
											</t:Permission>
											<t:Permission>
												<t:UserId>
													<t:PrimarySmtpAddress>${account3Email}</t:PrimarySmtpAddress>
													<t:DisplayName>${account3Email}</t:DisplayName>
												</t:UserId>
												<t:PermissionLevel>Reviewer</t:PermissionLevel>
											</t:Permission>
										</t:Permissions>
									</t:PermissionSet>
								</t:Folder>
							</t:SetFolderField>
						</t:Updates>
					</t:FolderChange>
				</FolderChanges>
			</UpdateFolder>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateFolderMsg = updateBody.UpdateFolderResponse
			.ResponseMessages.UpdateFolderResponseMessage;
		const updateMsg = Array.isArray(updateFolderMsg) ? updateFolderMsg[0] : updateFolderMsg;
		assert.exists(updateMsg.Folders.Folder.FolderId.$.Id,
			'UpdateFolder should return folder Id');

		// EWS: GetFolder again to verify both DisplayNames
		const getFolder2Res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:PermissionSet" />
					</t:AdditionalProperties>
				</FolderShape>
				<FolderIds>
					<t:FolderId Id="5" />
				</FolderIds>
			</GetFolder>`,
			account1Email, accountPassword
		);
		const getFolder2Body = ews.getBody(getFolder2Res);
		const getFolder2Msg = getFolder2Body.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folder2Msg = Array.isArray(getFolder2Msg) ? getFolder2Msg[0] : getFolder2Msg;
		assert.equal(folder2Msg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const permissions = folder2Msg.Folders.Folder.PermissionSet.Permissions.Permission;
		const permArray = Array.isArray(permissions) ? permissions : [permissions];
		const account2Perm = permArray.find(p => p.UserId?.DisplayName === account2Email);
		assert.exists(account2Perm, 'DisplayName of account2 should be present');
		const account3Perm = permArray.find(p => p.UserId?.DisplayName === account3Email);
		assert.exists(account3Perm, 'DisplayName of account3 should be present');
	});
});
