import config from '../../conf/config.js';
import common from '../core/common.js';
import yapople from 'yapople';

const popClient = yapople.Client;

const client = new popClient({
	hostname: config.serverHost,
	port: config.popPort,
	mailparser: true,
	tls: true,
	tlsOptions: { rejectUnauthorized: false }
});

const pop = {
	async fetchMessages({ userEmailAddress, userPassword }) {
		// Get user details
		client.username = userEmailAddress;
		client.password = userPassword;

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				clearTimeout(timer);
				reject('Pop connection timeout');
			}, 10000);

			client.connect(function () {
				clearTimeout(timer);

				common.log('Fetch messages using POP...');
				client.retrieveAll(function (error, messages) {
					if (error) reject(error);

					const folderMessages = [];
					messages.forEach(msg => {
						const messageMime = {
							From: msg.from[0].address,
							To: msg.to.map(toObj => toObj.address).join(' '),
							Subject: msg.subject,
							Body: msg.text
						};
						folderMessages.push(messageMime);
					});

					client.quit();
					common.log(folderMessages);
					resolve(folderMessages);
				});
			});
		});
	}
};

export default pop;