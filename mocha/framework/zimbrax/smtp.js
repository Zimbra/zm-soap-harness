import config from '../../conf/config.js';
import common from '../core/common.js';
import { SMTPClient } from 'emailjs';

const smtpServer = new SMTPClient({
	host: config.serverHost,
	port: config.smtpPort,
	timeout: 30000
});

const smtp = {
	async sendMessageUsingSMTP({ fromEmailAddress, toEmailAddress, subject, body } = {}) {
		return new Promise((resolve, reject) => {
			smtpServer.send({
				from: fromEmailAddress,
				to: toEmailAddress,
				subject,
				text: body

			}, function (error, respose) {
				if (error) {
					common.error(error || respose);
					reject(error);
				}
				resolve(respose.header['message-id']);
			});
		});
	}
};

export default smtp;