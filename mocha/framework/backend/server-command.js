import config from '../../conf/config.js';
import common from '../core/common.js';
import path from 'node:path';
import shelljs from 'shelljs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ServerCommand {
	execShellJsAsync(command, opts = {}, skipError = false) {
		let showProcessing = false;
		return new Promise((resolve, reject) => {
			if (showProcessing === true) {
				console.log(command);
			}
			if (skipError) {
				shelljs.exec(command, opts, (stdout) => {
					return resolve(stdout);
				});
			} else {
				shelljs.exec(command, opts, (code, stdout, stderr) => {
					if (code !== 0) {
						return reject(new Error(stderr));
					}
					return resolve(stdout);
				});
			}
		});
	}

	// Run command on server
	async runCommand(command, account, targetHost, opts, skipError = false) {
		let response, currentServerHost = config.serverHost;

		// Zimbra X
		if (String(config.serverEnvironment).toUpperCase().includes('ZIMBRAX')) {
			if (String(command).includes('/opt/zimbra/bin/')) {
				let mailboxPod = await this.getMailboxPod(account);
				command = `kubectl exec -i ${mailboxPod} --container zmc-mailbox -- /bin/bash -c '${String(command).replace('sudo ', '')}'`;
			}
		}

		// Multinode
		if (String(config.serverNode).toUpperCase().includes('MULTINODE')) {
			currentServerHost = config.mailboxServerHost1;
		}

		// Specified host
		if (targetHost) {
			currentServerHost = targetHost;
		}

		response = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${currentServerHost} "${command}"`, opts, skipError);
		return response;
	}

	// Run rsync command on server
	async runRsyncCommand(command) {
		return await this.execShellJsAsync(command);
	}

	// Get mailbox pod for zimbrax backend
	async getMailboxPod(account) {
		let mailboxPod = await this.execShellJsAsync(`bash ${path.join(__dirname, '..//..//framework/zimbrax/kubectl.sh')} \
SERVER_USER=${config.serverUser} SERVER_HOST=${config.serverHost} POD_TYPE=zmc-mailbox ACCOUNT_EMAIL_ADDRESS=${account}`);
		mailboxPod = `${String(mailboxPod).split(' ')[0].trim()}`;
		return mailboxPod;
	}

	// Create directory in container for zimbrax backend
	async createDirectoryInContainer(mailboxPod, directory) {
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
"kubectl exec -i ${mailboxPod} --container zmc-mailbox -- mkdir -p ${directory}"`);
	}

	// Copy directory from local machine to container for zimbrax backend
	async copyDirectoryFromLocalMachineToContainer(mailboxPod, directory) {
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
"kubectl cp ${directory} ${mailboxPod}:/home/ubuntu"`);
	}

	// Run server port
	async getSeverPort(portType) {
		let command, response, portNumber;

		// Zimbra X
		if (String(config.serverEnvironment).toUpperCase().includes('ZIMBRAX')) {
			if (portType === 'POP') {
				portNumber = '995';
				command = `kubectl get svc | grep -i ${portNumber}: | grep -oP '(?<=${portNumber}:).*(?=/TCP)' | cut -d / -f1`;
			} else if (portType === 'IMAP') {
				portNumber = '993';
				command = `kubectl get svc | grep -i ${portNumber}: | grep -oP '(?<=${portNumber}:).*(?=/TCP)'`;
			}
			response = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} "${command}"`);

		} else {
			if (portType === 'POP') {
				response = config[config.serverEnvironment].popPort;
			} else if (portType === 'IMAP') {
				response = config[config.serverEnvironment].imapPort;
			}
		}
		return response;
	}

	// Zimbra lmtp inject
	async zmLmtpInject(account, mimeDirectory, totalMessages) {
		let response;

		// Zimbra X
		if (String(config.serverEnvironment).toUpperCase().includes('ZIMBRAX')) {
			let mailboxPod = await this.getMailboxPod(account);

			// Create mime directory in container
			await this.createDirectoryInContainer(mailboxPod, mimeDirectory);

			// Copy mimes from local machine to container
			await this.copyDirectoryFromLocalMachineToContainer(mailboxPod, mimeDirectory);

			// Inject mimes from container
			response = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
"kubectl exec -i ${mailboxPod} --container zmc-mailbox -- /bin/bash -c '/opt/zimbra/bin/zmlmtpinject -s automation@lmtpinject.com -r ${account} -d ${mimeDirectory}'"`);

			// Zimbra Classic
		} else {
			response = await this.runCommand(`sudo /opt/zimbra/bin/zmlmtpinject -s automation@lmtpinject.com -r ${account} -d ${mimeDirectory}`);
		}
		await t.expect(response).contains('LmtpInject Finished', 'Verify lmtp inject finished');
		await t.expect(response).contains(`submitted=${totalMessages} failed=0`, 'Verify total submitted messages');
	}

	// Run command to get one time code
	async getOneTimeCode(account, authorizationCode) {
		let oneTimeCode, currentServerHost = config.serverHost;

		// Zimbra X
		if (String(config.serverEnvironment).toUpperCase().includes('ZIMBRAX')) {
			let mailboxPod = await this.getMailboxPod(account);

			oneTimeCode = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${currentServerHost} \
"kubectl exec -i ${mailboxPod} --container zmc-mailbox -- /bin/bash -c '/opt/zimbra/bin/zmtotp -a ${account} -s ${authorizationCode}'"`);
			oneTimeCode = String(oneTimeCode).replace('Current TOTP code is: ', '');

			// Zimbra classic
		} else {
			if (String(config.serverNode).toUpperCase().includes('MULTINODE')) {
				currentServerHost = config.mailboxServerHost1;
			}
			oneTimeCode = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${currentServerHost} \
"sudo /opt/zimbra/bin/zmtotp -a ${account} -s ${authorizationCode}"`);
			oneTimeCode = String(oneTimeCode).replace('Current TOTP code is: ', '');
		}
		return oneTimeCode;
	}

	// Run command to share mailbox
	async shareMailbox(granterEmailAddress, granteeEmailAddress, permissions) {
		let currentServerHost = config.serverHost;

		// Zimbra X
		if (String(config.serverEnvironment).toUpperCase().includes('ZIMBRAX')) {
			let mailboxPod = await this.getMailboxPod(granteeEmailAddress);

			this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${currentServerHost} \
"kubectl exec -i ${mailboxPod} --container zmc-mailbox -- /bin/bash -c '/opt/zimbra/bin/zmmailbox -z -m ${granterEmailAddress} mfg / account ${granteeEmailAddress} ${permissions}'"`);

			// Zimbra Classic
		} else {
			if (String(config.serverNode).toUpperCase().includes('MULTINODE')) {
				currentServerHost = config.mailboxServerHost1;
			}
			this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${currentServerHost} \
"sudo /opt/zimbra/bin/zmmailbox -z -m ${granterEmailAddress} mfg / account ${granteeEmailAddress} ${permissions}"`);
		}
		await common.sleep(15000);
	}

	async getClientHostFQDN() {
		let regex = /http[s]?:\/\/([^\s:]*)/;
		let found = config.clientHostURL.match(regex);
		return found ? found[1] : '';
	}

	async getServerIpAddress(hostname) {
		// function to get stdout anyway
		function runCommandIgnoringError(command, opts = {}) {
			return new Promise(resolve => {
				shelljs.exec(command, opts, (code, stdout) => {
					return resolve(stdout);
				});
			});
		}

		// nslookup does not work when a host is added to hosts file on a local machine which executes testcafe
		// Use "ping -c" on Linux, or "ping -n" for Mac and Windows
		let regex = /\d+\.\d+\.\d+\.\d+/;
		let ipAddress;

		// Linux
		let pingResult = await runCommandIgnoringError(`ping -c 1 ${hostname}`, { silent: true });
		// There are two cases: a) "ping -c" is not supported or b) the server does not return a response
		if (pingResult) {
			let found = pingResult.match(regex);
			if (found) {
				ipAddress = found[0];
			}
		}

		if (ipAddress) {
			return ipAddress;
		}

		// Mac and Windows
		pingResult = await runCommandIgnoringError(`ping -n 1 ${hostname}`, { silent: true });
		if (pingResult) {
			let found = pingResult.match(regex);
			if (found) {
				ipAddress = found[0];
			}
		}

		return ipAddress;
	}
}

export default new ServerCommand();
