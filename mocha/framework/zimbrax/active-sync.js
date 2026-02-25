import config from '../../conf/config.js';
import common from '../core/common.js';
import activeSyncClient from 'asclient';

const activeSync = {
	options: {
		endpoint: `https://${config.serverHost}:${config.clientPort}/Microsoft-Server-ActiveSync`,
		device: {
			id: 'api-automation-0123456789',
			type: 'api-automation-device'
		}
	},

	async fetchMessages({ userEmailAddress, userPassword, userFolder = 'Inbox' } = {}) {
		this.options.username = userEmailAddress;
		this.options.password = userPassword;

		common.log('Fetch messages using ActiveSync...');
		const myActiveSyncClient = activeSyncClient(this.options);
		await myActiveSyncClient.provision();
		await myActiveSyncClient.folderSync();

		myActiveSyncClient.opts.folders = myActiveSyncClient.opts.folders.filter(folder => folder.DisplayName[0] === userFolder);
		await myActiveSyncClient.enableEmailSync();
		await myActiveSyncClient.sync();
		common.log(myActiveSyncClient.opts);

		const folderMessages = [];
		Object.keys(myActiveSyncClient.contents).forEach(ServerId => {
			const folderContent = myActiveSyncClient.contents[ServerId];
			common.log(folderContent);

			for (let i = 0; i < folderContent.length; i++) {
				const messageDetails = folderContent[i].ApplicationData[0];
				const messageMime = {
					From: messageDetails.From.join(' '),
					To: messageDetails.To.join(' '),
					Subject: messageDetails.Subject.join(' '),
					Body: messageDetails.Body[0].Data.join(' ')
				};
				folderMessages.push(messageMime);
			}
		});

		common.log(folderMessages);
		return folderMessages;
	}
};

export default activeSync;
