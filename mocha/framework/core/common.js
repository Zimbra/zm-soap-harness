import config from '../../conf/config.js';
import * as utils from './utils.js';
import soap from '../backend/soap-client.js';
import log4js from 'log4js';
import fs from 'node:fs';
import path from 'node:path';
import shelljs from 'shelljs';
import { assert } from 'chai';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectName = String(process.env.CIRCLE_WORKING_DIRECTORY).split('/')[1] || 'zm-api-automation';
const projectDir = path.join(__dirname.split(projectName)[0]) + projectName;
const reportPath = process.env.REPORT_PATH || path.join(projectDir + '/test-reports');

const common = {
	adminAuthToken: null,
	domainId: null,
	cosId: null,
	zimbraVersionArray: [],
	zimbraVersion: null,
	isZimbraNetwork: false,
	isZimbra101: false,
	isZimbra101OrAfter: false,
	logFileName: 'soap.txt',

	async configuration(jsFilePath, ctx) {
		if (process.env.CONFIG_INITIALIZE) {
			return;
		} else {
			process.env.CONFIG_INITIALIZE = true;
		}

		// Logger
		log4js.configure({
			appenders: {
				out: { type: 'stdout', layout: { type: 'colored' } },
				file: { type: 'file', filename: `${reportPath}/${this.logFileName}` }
			}, categories: {
				default: { appenders: ['out', 'file'], level: 'info' }
			}
		});

		// Console log
		if (config.showConsoleLog === true) {
			let logFilePath = await this.getLogFilePath(jsFilePath);
			log4js.configure({
				appenders: {
					out: { type: 'stdout', layout: { type: 'basic' } },
					file: { type: 'file', filename: logFilePath }
				}, categories: {
					default: { appenders: ['out', 'file'], level: 'debug' }
				}
			});

			fs.appendFile(logFilePath, `${jsFilePath}\n`, (error) => {
				if (error) {
					this.loggerError(error);
					throw new Error('Error occurred when writing to log file: ' + error);
				}
			});
		}

		// Admin auth
		if (this.adminAuthToken === null) {
			this.adminAuthToken = await soap.getAdminAuthToken(config.adminEmailAddress, config.adminPassword);
		}

		// Parse zimbra version
		if (this.zimbraVersionArray.length === 0) {
			this.zimbraVersionArray = await this.parseZimbraVersion(this.adminAuthToken);
		}

		// Start the logger
		ctx.logger = log4js.getLogger('info');
		ctx.adminAuthToken = this.adminAuthToken;
		ctx.zimbraVersionArray = this.zimbraVersionArray;

		// Print console
		console.log('--------------------------------------------------------------------------------------------');
		await ctx.logger.info(`Server Type: ${config.serverType}`);
		await ctx.logger.info(`Server Environment: ${config.serverEnvironment}`);
		await ctx.logger.info(`Server Node: ${config.serverNode}`);
		await ctx.logger.info(`Server Host: ${config.serverHost}`);
		await ctx.logger.info(`Zimbra Version: ${this.zimbraVersion}`);
		await ctx.logger.info(`Jobs: ${config.jobs ?? 20}`);
		await ctx.logger.info(`Zimlet: ${config.zimlet}`);
		await ctx.logger.info(`Chat: ${config.chat}`);
		if (config.chat === true) {
			await ctx.logger.info(`Zulip Server: ${config.zulipServer}`);
		}
		await ctx.logger.info(`Serial: ${config.serial}`);
		await ctx.logger.info(`Configure Server: ${config.configure}`);
		await ctx.logger.info(`Fresh Setup: ${config.freshSetup}`);

		if (ctx.adminAuthToken !== null && ctx.adminAuthToken !== '' && typeof ctx.adminAuthToken !== 'undefined') {
			await ctx.logger.info(`Server Admin Auth: ${String(this.adminAuthToken).substring(0, 30)}...`);

			// Configure server
			let printTestDomainCosId = false;
			if (config.configure === true) {
				try {
					let configure = await soap.configureServer();
					await ctx.logger.info(`Server Domain: ${config.testDomain} (${configure.domainId})`);
					await ctx.logger.info(`Server COS : ${config.testCos} (${configure.cosId})`);
				} catch (error) {
					await ctx.logger.info('Create SOAP Domain, COS: FAILED');
					console.log(error);
				}

			} else {
				if (printTestDomainCosId === true) {
					this.cosId = await soap.getCos(this.adminAuthToken, config.testCos);
					this.domainId = await soap.getDomain(this.adminAuthToken, config.testDomain);
					await ctx.logger.info(`Server Domain: ${config.testDomain} (${this.domainId})`);
					await ctx.logger.info(`Server COS : ${config.testCos} (${this.cosId})`);
				} else {
					await ctx.logger.info('Create SOAP Domain, COS: SKIPPED');
				}
			}
		} else {
			await ctx.logger.info('Server Admin Auth: FAILED');
		}
		console.log('--------------------------------------------------------------------------------------------');
	},

	async getLogFilePath(jsFilePath) {
		let logFilePath = String(jsFilePath).replace(`${projectDir}\\tests\\soap\\tests`,
			`${projectDir}\\${reportPath}\\tests`).replace('.js', '.txt');
		if (!this.isResultFolderCreated) {
			this.isResultFolderCreated = true;
		}
		return logFilePath;
	},

	// Get zimbra version
	async parseZimbraVersion(adminAuthToken) {
		if (this.zimbraVersionArray.length) {
			return this.zimbraVersionArray;
		}
		let zimbraVersion = String(await soap.getVersionInfo(adminAuthToken)); // e.g. 10.0.11_GA_4702.NETWORK
		this.zimbraVersion = zimbraVersion;
		this.isZimbraNetwork = zimbraVersion.includes('NETWORK');
		zimbraVersion = zimbraVersion.split('_')[0]; // e.g. 10.0.11
		let versionArray = String(zimbraVersion).split('.'); // e.g. ['10', '0', '11']
		for (let i = 0; i < versionArray.length; i++) {
			versionArray[i] = Number.parseInt(versionArray[i]); // e.g. [10, 0, 11]
		}
		this.zimbraVersionArray = versionArray;

		// Set version
		this.isZimbra101 = this.zimbraVersionArray[0] === 10 && this.zimbraVersionArray[1] === 1;
		this.isZimbra101OrAfter = (this.zimbraVersionArray[0] === 10 && this.zimbraVersionArray[1] >= 1) || this.zimbraVersionArray[0] >= 11;

		return this.zimbraVersionArray;
	},

	log: utils.log,
	error: utils.error,
	sleep: utils.sleep,
	getUniqueString: utils.getUniqueString,
	getDateyyyymmdd: utils.getDateyyyymmdd,
	getClientMachineTodayDate: utils.getClientMachineTodayDate,
	retryUntil: utils.retryUntil,

	convertDateTime(date) {
		let convertedDate;
		let currentDate = new Date(date);
		let dd = currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate();
		let mm = currentDate.getMonth() + 1 < 10 ? '0' + (currentDate.getMonth() + 1) : currentDate.getMonth() + 1;
		let yyyy = currentDate.getFullYear().toString();
		let hours = currentDate.getHours() < 10 ? '0' + currentDate.getHours() : currentDate.getHours();
		let minute = currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : currentDate.getMinutes();
		convertedDate = yyyy + mm + dd + 'T' + hours + minute + '00';
		return convertedDate;
	},

	convertTZdateBasedClientMachine(d) {
		let serverDate = d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 11) + ':' + d.slice(11, 13) + ':' + d.slice(13, 16);
		let dd = new Date(serverDate);
		let month = String(dd.getMonth() + 1).length === 1 ? '0' + (dd.getMonth() + 1) : (dd.getMonth() + 1);
		let hours = String(dd.getHours()).length === 1 ? '0' + dd.getHours() : dd.getHours();
		let minute = String(dd.getMinutes()).length === 1 ? '0' + dd.getMinutes() : dd.getMinutes();
		return dd.getDate() + '-' + month + '-' + dd.getFullYear() + ' ' + hours + ':' + minute + ':' + dd.getSeconds();
	},

	async execShellJsAsync(command, opts = {}) {
		return new Promise((resolve, reject) => {
			this.log(`\n${String(command).replace(/\t/g, '')}`);
			shelljs.exec(command, opts, (code, stdout, stderr) => {
				if (code !== 0) {
					return reject(new Error(stderr));
				}
				return resolve(stdout.replace(/['"]+/g, '').trim());
			});
		});
	},

	// Usage: await common.runCommandOnServer('ls -l');
	async runCommandOnServer(command) {
		let proxyPod = await this.execShellJsAsync(`bash ${path.join(__dirname, '../framework/zimbrax/kubectl.sh')} \
			SERVER_USER=${config.serverUser} SERVER_HOST=${config.serverHost} POD_TYPE=zmc-proxy`);
		proxyPod = `${String(proxyPod.split(' ')[0]).trim()}`;

		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${proxyPod} -- /bin/bash -c '${command}'"`);
	},

	async getMailboxPod(accountEmailAddress) {
		let mailboxPod = await this.execShellJsAsync(`bash ${path.join(__dirname, '../framework/zimbrax/kubectl.sh')} \
			SERVER_USER=${config.serverUser} SERVER_HOST=${config.serverHost} POD_TYPE=zmc-mailbox ACCOUNT_EMAIL_ADDRESS=${accountEmailAddress}`);
		mailboxPod = `${String(mailboxPod.split(' ')[0]).trim()}`;
		return mailboxPod;
	},

	async runCommandOnMailboxPod(command, accountEmailAddress) {
		let mailboxPod = await this.getMailboxPod(accountEmailAddress);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl exec -i ${mailboxPod} -- /bin/bash -c '${command}'"`);
	},

	async getRunningPodsCount(podType) {
		return await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl get pods | grep -i ${podType} | grep Running | grep 1/1 | wc -l"`);
	},

	async waitTillPodUp(podType, totalReplicas) {
		// Wait till each pod up
		for (let i = 0; i < totalReplicas; i++) {
			await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
				"for (( i=0; i<=100; i++ )); do \
					if kubectl get pods | grep '${podType}-${i}' | grep Running | grep 1/1; then \
						echo -e '${podType}-${i} pod is up now'; \
						break; \
					else \
						sleep 5; \
						echo -e 'Waiting for ${podType}-${i} pod to be up...'; \
					fi \
				done"`);
		}
	},

	async waitTillRunningPodCountMatches(podType, totalReplicas) {
		// Wait till pod count matches
		let getPodsCount, pollingCount = 100;

		for (let i = 0; i <= pollingCount; i++) {
			getPodsCount = await this.getRunningPodsCount(podType);

			if (String(getPodsCount) === String(totalReplicas)) {
				break;
			} else {
				this.log(`Waiting for ${podType} pod count matches...`);
				this.sleep(1000);
			}

			if (i === pollingCount) {
				assert.fail('Maximum timeout reached for matching pod count');
			}
		}
	},

	async getProxyPodNames() {
		let proxyPods = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			kubectl get pods | grep 'zmc-proxy'`);
		let pods = proxyPods.split('\n');
		let noOfProxyPods = pods.length;
		let podNames = [];
		for (let i = 0; i < noOfProxyPods; i++) {
			podNames.push(pods[i].substring(0, pods[i].indexOf(' ')));
		}
		return podNames;
	},

	async getMLSPodNames() {
		let mlsPods = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			kubectl get pods | grep 'zmc-mls'`);
		let pods = mlsPods.split('\n');
		let noOfMLSPods = pods.length;
		let podNames = [];
		for (let i = 0; i < noOfMLSPods; i++) {
			podNames.push(pods[i].substring(0, pods[i].indexOf(' ')));
		}
		return podNames;
	},

	async modifyReplica(podType, totalReplicas) {
		// Modify total replica
		this.log(`Modify total ${podType} replica to ${totalReplicas}`);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl scale statefulsets ${podType} --replicas=${totalReplicas}"`);
	},

	async modifyReplicaUsingRenderedTemplates(podType, totalReplicas) {
		let ymlPath = `~/git/zm-kubernetes/rendered/${podType}.yml`;

		// Render templates
		this.log('make clean_rendered_templates and rendered_templates');
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"cd ~/git/zm-kubernetes && make clean_rendered_templates"`);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"cd ~/git/zm-kubernetes && make rendered_templates"`);

		// Modify total replica
		this.log(`Modify total ${podType} replica to ${totalReplicas}`);
		let getReplicas = await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"cat ${ymlPath} | grep -i replicas | sed -e 's/^[ \t]*//'"`);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"sed -i 's/${getReplicas}/replicas: ${totalReplicas}/g' ${ymlPath}"`);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"cat ${ymlPath} | grep -i replicas | sed -e 's/^[ \t]*//'"`);

		// Apply modified template
		this.log(`kubectl apply -f ${ymlPath}"`);
		await this.execShellJsAsync(`ssh -qo "StrictHostKeyChecking no" ${config.serverUser}@${config.serverHost} \
			"kubectl apply -f ${ymlPath}"`);
	}
};

export default common;