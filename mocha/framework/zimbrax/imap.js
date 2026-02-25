import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import imapClient from 'imap-simple';

const imapConfig = {
	imap: {
		host: config.serverHost,
		port: config.imapPort,
		authTimeout: 30000,
		tls: true,
		tlsOptions: { rejectUnauthorized: false }
	}
};

const closeImapConnection = (obj) => {
	try {
		if (obj.connection !== null) {
			obj.connection.end();
		}
	} catch (error) {
		common.log('connection close error', error);
	}
};

const imap = {
	async fetchMessages({ userEmailAddress, userPassword }) {
			const searchCriteria = ['UNSEEN'];
			const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };
		this.connection = null;
		this.subjects = [];

		// Get user details
		imapConfig.imap.user = await userEmailAddress;
		imapConfig.imap.password = userPassword;

		try {
			this.connection = await imapClient.connect(imapConfig);

			await this.connection.openBox('INBOX');
			common.log('Fetch messages using IMAP...');
			const results = await this.connection.search(searchCriteria, fetchOptions);
			this.subjects = results.map(function (res) {
				return res.parts.filter(function (part) {
					return part.which === 'HEADER';
				})[0].body.subject[0];
			});

			common.log(this.subjects);
			return this.subjects;

		} catch (error) {
			throw error;

		} finally {
			closeImapConnection(this);
		}
	}
};

export default imap;
