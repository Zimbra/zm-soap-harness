import config from '../../conf/config.js';
import common from '../core/common.js';
import { soap } from '../backend/soap-client.js';
import { assert } from 'chai';

const mailboxLogFile = '/opt/zimbra/log/mailbox.log';
const syncLogFile = '/opt/zimbra/log/sync.log';

const affinity = {
	// ---------- Active Sync ----------
	async verifyActiveSyncAffinity(accountEmailAddress, deviceId) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);

		let grepProvisioningString = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${syncLogFile} | grep '${deviceId}' | grep 'Cmd=Provision' | tail -n 1"`);
		common.log(`\ngrepProvisioningString: ${grepProvisioningString}`);

		let grepFolderSyncCmd = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${syncLogFile} | grep '${deviceId}' | grep 'Cmd=FolderSync' | tail -n 1"`);
		common.log(`\ngrepFolderSyncCmd: ${grepFolderSyncCmd}`);

		if (grepProvisioningString && grepFolderSyncCmd) {
			let provisioningCmd = String(await common.execShellJsAsync(`echo "${grepProvisioningString}" | awk 'BEGIN { FS = "sync - HTTP/1.1" } ; { print $2 }'`));
			common.log(`\nprovisioningCmd: ${provisioningCmd}`);

			let folderSyncCmd = String(await common.execShellJsAsync(`echo "${grepFolderSyncCmd}" | awk 'BEGIN { FS = "sync - HTTP/1.1" } ; { print $2 }'`));
			common.log(`\nfolderSyncCmd: ${folderSyncCmd}`);

			if (provisioningCmd === '200 OK' && folderSyncCmd === '200 OK') {
				let grepSyncCmd = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
					"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${syncLogFile} | grep '${deviceId}' | grep 'Cmd=Sync' | tail -n 1"`);
				common.log(`\ngrepSyncCmd: ${grepSyncCmd}`);

				let syncCmd = String(await common.execShellJsAsync(`echo "${grepSyncCmd}" | awk 'BEGIN { FS = "sync - HTTP/1.1" } ; { print $2 }'`));
				common.log(`\nsyncCmd: ${syncCmd}`);

				if (syncCmd === '200 OK') {
					return true;
				}
			}
		}
		return false;
	},

	// ---------- CalDAV ----------
	async verifyCalDAVAffinity(accountEmailAddress, inviteeEmailAddress, eventName) {
		let mailboxPod = await common.getMailboxPod(inviteeEmailAddress);
		let calDAVString = 'dav - DavServlet operation REPORT to /home/' + accountEmailAddress + '/Calendar/ (depth: one)';

		let grepEventFromLog = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${inviteeEmailAddress}' | grep '${eventName}'"`);
		common.log(`\ngrepEventFromLog: ${grepEventFromLog}`);

		if (grepEventFromLog) {
			mailboxPod = await common.getMailboxPod(accountEmailAddress);

			let grepDavLog = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${accountEmailAddress}' | grep '${calDAVString}' | tail -n 1"`);
			common.log(`\ngrepDavLog: ${grepDavLog}`);

			if (grepDavLog) {
				return true;
			}
		}
		return false;
	},

	// ---------- CardDAV ----------
	async verifyCardDAVAffinity(accountEmailAddress) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);
		let cardDAVString = 'dav - DavServlet operation REPORT to /home/' + accountEmailAddress + '/Contacts/ (depth: one)';

		let grepEventFromLog = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${accountEmailAddress}' | grep '${cardDAVString}' | tail -n 1"`);
		common.log(`\ngrepEventFromLog: ${grepEventFromLog}`);

		if (grepEventFromLog) {
			return true;
		}
		return false;
	},

	// ---------- EWS ----------
	async verifyEWSAffinity(accountEmailAddress, messageSubject) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);

		let grepRequestFromSyncLog = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${syncLogFile} | grep '${messageSubject}' | grep 'To=${accountEmailAddress}'"`);
		common.log(`\ngrepRequestFromSyncLog: ${grepRequestFromSyncLog}`);

		if (grepRequestFromSyncLog) {
			return true;
		}
		return false;
	},

	// ---------- POP, IMAP ----------
	async authenticatePOPIMAPProtocol(accountEmailAddress, protocolName, mailboxPod) {
		let serverName = null;
		let grepLoginString = 'user ' + accountEmailAddress + ' authenticated, mechanism=LOGIN';

		if (protocolName === 'pop') {
			serverName = 'Pop3SSLServer';
		} else if (protocolName === 'imap') {
			serverName = 'ImapSSLServer';
		}

		let protocolAuthenticationCommand = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${serverName}' | grep '${protocolName} - ${grepLoginString}' | tail -n 1"`);
		common.log(`\nprotocolAuthenticationCommand: ${protocolAuthenticationCommand}`);

		if (protocolAuthenticationCommand) {
			return true;
		}
		return false;
	},

	async verifyPOPIMAPProtocolAffinity(accountEmailAddress, protocolName) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);

		let protocolLoginCommand = null;
		let protocolAuthentication = await this.authenticatePOPIMAPProtocol(accountEmailAddress, protocolName, mailboxPod);

		if (protocolAuthentication) {
			if (protocolName === 'pop') {
				protocolLoginCommand = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
					"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep 'Pop3SSLServer' | grep 'name=${accountEmailAddress}' | \
					grep '${protocolName} - RETR' | tail -n 1"`);

			} else if (protocolName === 'imap') {
				protocolLoginCommand = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
					"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep 'ImapSSLServer' | grep 'name=${accountEmailAddress}' | \
					grep '${protocolName} - LOGIN' | tail -n 1"`);
			}
			common.log(`\nprotocolLoginCommand: ${protocolLoginCommand}`);

			if (protocolLoginCommand) {
				return true;
			}
		}
		return false;
	},

	// ---------- SMTP ----------
	async verifySMTPProtocolAffinity(accountEmailAddress, sendMessageId) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);

		let grepSendingMessageToMTA = 'Sending message to MTA at zmc-mta:';
		let grepAddingMessageId = 'mailop - Adding Message: id=' + sendMessageId;
		let verifySoapId = await this.verifySOAPId('smtp', grepSendingMessageToMTA, mailboxPod);

		if (!verifySoapId) {
			let mailopString = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${grepAddingMessageId}' | tail -n 1 " | \
				awk 'BEGIN { FS = "soapId=" } ; { print $2 }'`);
			common.log(`\nmailopString: ${mailopString}`);

			let mailopMessageId = await common.execShellJsAsync(`echo "${mailopString}" | cut -d'<' -f2 | cut -d'>' -f1`);
			common.log(`\nmailopMessageId: ${mailopMessageId}`);

			let smtpString = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep 'smtp - ${grepSendingMessageToMTA}' | grep 'Message-ID=<${mailopMessageId}>' | tail -n 1 " | \
				awk 'BEGIN { FS = "soapId=" } ; { print $2 }'`);
			common.log(`\nsmtpString: ${smtpString}`);

			let mailopSoapId = await common.execShellJsAsync(`echo "${mailopString}" | cut -d';' -f1`);
			common.log(`\nmailopSoapId: ${mailopSoapId}`);

			let smtpSoapId = await common.execShellJsAsync(`echo "${smtpString}" | cut -d';' -f1`);
			common.log(`\nsmtpSoapId: ${smtpSoapId}`);

			if (mailopSoapId === smtpSoapId) {
				let grepDeliveryMessageId = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
					"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep 'lmtp - Delivering message:' | grep '${mailopMessageId}' | tail -n 1 "`);
				if (grepDeliveryMessageId !== '' && grepDeliveryMessageId) {
					return true;
				}
			}
		}
		return false;
	},

	// ---------- SOAP ----------
	async verifySOAPId(protocolName, grepString, mailboxPod) {
		let requestedSoapId = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${protocolName} - ${grepString}' | tail -n 1 " | \
			awk 'BEGIN { FS = "soapId=" } ; { print $2 }' | cut -d';' -f1`);
		common.log(`\nrequestedSoapId: ${requestedSoapId}`);

		let proxyRequestSoapId = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${protocolName} - Proxying request:' | tail -n 1 " | \
			awk 'BEGIN { FS = "soapId=" } ; { print $2 }' | cut -d';' -f1`);
		common.log(`\nproxyRequestSoapId: ${proxyRequestSoapId}`);

		if (requestedSoapId === proxyRequestSoapId) {
			return true;
		}
		return false;
	},

	async verifyMailboxSOAPAffinity(accountEmailAddress, mailboxPod, requestName) {
		let verifySoapId = await this.verifySOAPId('soap', requestName, mailboxPod);
		if (!verifySoapId) {
			let grepRequestFromMailboxLog = await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				"kubectl exec -i ${mailboxPod} -- tail -n 1000 ${mailboxLogFile} | grep '${accountEmailAddress}' | grep 'soap - ${requestName}' | tail -n 1"`);
			common.log(`\ngrepRequestFromMailboxLog: ${grepRequestFromMailboxLog}`);

			if (grepRequestFromMailboxLog) {
				return true;
			}
			return false;
		}
	},

	// Verify SOAP request shifts to other pod when pod goes down and switches back to original pod when it comes back
	async verifyAffinityOnMailboxPodDisruption(accountEmailAddress, requestName, accountAuthToken) {
		let mailboxPod = await common.getMailboxPod(accountEmailAddress);

		common.log(`\nAffinity of e-mail address ${accountEmailAddress} is on ${mailboxPod}`);
		let verifyMailboxSOAPAffinity = await this.verifyMailboxSOAPAffinity(accountEmailAddress, mailboxPod, requestName);

		if (verifyMailboxSOAPAffinity) {
			common.log(`\nDeleting pod ${mailboxPod}...`);
			await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				kubectl delete pod ${mailboxPod}`);

			// Verify client curl response
			let clientURLResponse = await common.execShellJsAsync(`curl -s -I -w "%{http_code}" https://${config.serverHost}:${config.clientPort} | head -n 1`);
			assert.equal(String(clientURLResponse), 'HTTP/1.1 200 OK', 'Verify client url is accessible');

			let updatedMailboxPod = await common.getMailboxPod(accountEmailAddress);
			common.log(`\nNow, affinity of e-mail address ${accountEmailAddress} is on ${updatedMailboxPod}`);

			await soap.getInfo(accountAuthToken);
			let verifyUpdatedSOAPAffinity = await this.verifyMailboxSOAPAffinity(accountEmailAddress, updatedMailboxPod, requestName);

			if (verifyUpdatedSOAPAffinity) {
				await common.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
					"while true; do \
						if kubectl get pods | grep ${mailboxPod} | grep Running | grep 1/1; then \
							echo -e '${mailboxPod} pod is up now'; \
							break; \
						else \
							sleep 10s; \
							echo -e 'Waiting for ${mailboxPod} pod to be up...'; \
						fi \
					done"`);

				common.log(`\nNow, affinity of e-mail address ${accountEmailAddress} is on ${updatedMailboxPod}`);
				await soap.getInfo(accountAuthToken);
				if (await this.verifyMailboxSOAPAffinity(accountEmailAddress, mailboxPod, requestName)) {
					return true;
				}
			}
		}
		return false;
	}
};

export default affinity;