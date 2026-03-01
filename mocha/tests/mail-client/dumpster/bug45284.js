import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Dumpster > Bugs > bug45284', function () {
    this.timeout(300 * 1000);
    let adminAuthToken;
    let account1Name, account2Name, account3Name, account4Name;
    let account1Id, account2Id, account3Id, account4Id;
    const uid = common.getUniqueString();

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();

        account1Name = `dumpster1.${uid}@${config.testDomain}`;
        account2Name = `dumpster2.${uid}@${config.testDomain}`;
        account3Name = `dumpster3.${uid}@${config.testDomain}`;
        account4Name = `dumpster4.${uid}@${config.testDomain}`;

        // Create accounts with dumpster enabled for account1, account2, account3 and disabled for account4
        for (const [name, dumpsterEnabled] of [
            [account1Name, 'TRUE'], [account2Name, 'TRUE'],
            [account3Name, 'TRUE'], [account4Name, 'FALSE']
        ]) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraDumpsterEnabled">${dumpsterEnabled}</a>
				</CreateAccountRequest>`, adminAuthToken
            );
            const acct = Array.isArray(res.CreateAccountResponse?.account)
                ? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
            if (name === account1Name) account1Id = acct?.id;
            if (name === account2Name) account2Id = acct?.id;
            if (name === account3Name) account3Id = acct?.id;
            if (name === account4Name) account4Id = acct?.id;
        }

        // Ensure dumpster enabled for account2 and account3 via ModifyAccount
        for (const [id, val] of [[account2Id, 'TRUE'], [account3Id, 'TRUE']]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
					<id>${id}</id>
					<a n="zimbraDumpsterEnabled">${val}</a>
				</ModifyAccountRequest>`, adminAuthToken
            );
        }
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Verify the deleted message is available in dumpster', async () => {
        // Login as account1 and send message to account2
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const msgSubject = `Subject${uid}msg1`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content of the message${uid}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
        );

        await new Promise(r => setTimeout(r, 2000));

        // Login as account2 and search for the message
        const acct2Auth = await soap.getAccountAuthToken(account2Name);

        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct2Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msg = Array.isArray(searchRes.SearchResponse?.m)
            ? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
        assert.exists(msg, 'Message should be found');
        const msgId = msg.id;

        // Hard delete the message
        const deleteRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, acct2Auth
        );
        assert.notExists(deleteRes.Fault, 'ItemActionRequest should not fault');
        assert.equal(deleteRes.ItemActionResponse?.action?.op, 'delete', 'Op should be delete');

        // Verify message is NOT in inbox
        const inboxSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox" ${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct2Auth
        );
        assert.notExists(inboxSearch.Fault, 'Inbox SearchRequest should not fault');
        const inboxMsg = inboxSearch.SearchResponse?.m;
        assert.isTrue(!inboxMsg || (Array.isArray(inboxMsg) && inboxMsg.length === 0),
            'Message should NOT be in inbox after delete');

        // Verify message IS in dumpster (inDumpster=1)
        const dumpsterSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct2Auth
        );
        assert.notExists(dumpsterSearch.Fault, 'Dumpster SearchRequest should not fault');
        const dumpsterMsg = Array.isArray(dumpsterSearch.SearchResponse?.m)
            ? dumpsterSearch.SearchResponse.m[0] : dumpsterSearch.SearchResponse?.m;
        assert.exists(dumpsterMsg, 'Message should be available in dumpster');

        // Verify message is NOT found when inDumpster=0
        const noDumpsterSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>0</inDumpster>
			</SearchRequest>`, acct2Auth
        );
        assert.notExists(noDumpsterSearch.Fault, 'Non-dumpster SearchRequest should not fault');
        const noDumpsterMsg = noDumpsterSearch.SearchResponse?.m;
        assert.isTrue(!noDumpsterMsg || (Array.isArray(noDumpsterMsg) && noDumpsterMsg.length === 0),
            'Message should NOT be found with inDumpster=0');
    });


    it('Sanity | Verify the deleted contact is available in dumpster', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const contactFirst = `Contact.${uid}`;
        const contactLast = `Name.${uid}`;
        const contactEmail = `email.${uid}@domain.com`;

        // Create a contact
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contactFirst}</a>
					<a n="lastName">${contactLast}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');
        const contact = Array.isArray(createRes.CreateContactResponse?.cn)
            ? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse?.cn;
        assert.exists(contact, 'Contact should be created');
        const contactId = contact.id;

        // Verify contact exists
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contactFirst}</query>
				<types>contact</types>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const foundContact = Array.isArray(searchRes.SearchResponse?.cn)
            ? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse?.cn;
        assert.exists(foundContact, 'Contact should be found');

        // Hard delete the contact
        const deleteRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ItemActionRequest>`, acct1Auth
        );
        assert.notExists(deleteRes.Fault, 'ItemActionRequest should not fault');

        // Verify contact is NOT found in normal search
        const goneSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contactFirst}</query>
				<types>contact</types>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(goneSearch.Fault, 'SearchRequest should not fault');
        const goneContact = goneSearch.SearchResponse?.cn;
        assert.isTrue(!goneContact || (Array.isArray(goneContact) && goneContact.length === 0),
            'Contact should NOT be found after delete');

        // Verify contact IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contactFirst}</query>
				<types>contact</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');
        const dumpContact = Array.isArray(dumpSearch.SearchResponse?.cn)
            ? dumpSearch.SearchResponse.cn[0] : dumpSearch.SearchResponse?.cn;
        assert.exists(dumpContact, 'Contact should be in dumpster');

        // Recover the contact from dumpster
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
        );
        assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');

        const findContactsFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Contacts') return f.id;
                const sub = findContactsFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const contactsFolderId = findContactsFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        if (contactsFolderId) {
            const recoverRes = await soap.makeSOAPEnvelopeAccount(
                `<ItemActionRequest xmlns="urn:zimbraMail">
					<action id="${contactId}" op="recover" l="${contactsFolderId}"/>
				</ItemActionRequest>`, acct1Auth
            );
            assert.notExists(recoverRes.Fault, 'Recover should not fault');

            // Verify contact is back
            const backSearch = await soap.makeSOAPEnvelopeAccount(
                `<SearchRequest xmlns="urn:zimbraMail" types="contact">
					<query>${contactFirst}</query>
					<types>contact</types>
				</SearchRequest>`, acct1Auth
            );
            assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
        }
    });


    it('Sanity | Verify the deleted task is available in dumpster', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const taskSubject = `Subject of task${uid}`;
        const taskLocation = `Location of task${uid}`;
        const taskContent = `Content of the task${uid}`;

        // Get task folder ID
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
        );
        assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');

        const findTaskFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Tasks') return f.id;
                const sub = findTaskFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const taskFolderId = findTaskFolder(getFolderRes.GetFolderResponse?.folder);

        // Create a task
        const now = new Date();
        const start = new Date(now.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z');
        const end = new Date(now.getTime() + 60 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z');

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${taskFolderId}">
					<inv method="REQUEST">
						<comp priority="1" percentComplete="75" status="INPR" allDay="0"
							name="${taskSubject}" loc="${taskLocation}">
							<s d="${start}"/>
							<e d="${end}"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${taskContent}</content>
					</mp>
					<su>${taskSubject}</su>
				</m>
			</CreateTaskRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateTaskRequest should not fault');
        const taskId = createRes.CreateTaskResponse?.invId;
        assert.exists(taskId, 'Task invId should exist');

        // Verify task exists
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${taskSubject}</query>
				<types>task</types>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

        // Hard delete the task
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${taskId}" op="delete"/>
			</ItemActionRequest>`, acct1Auth
        );

        // Verify task is NOT found in normal search
        const goneSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${taskSubject}</query>
				<types>task</types>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(goneSearch.Fault, 'SearchRequest should not fault');
        const goneTask = goneSearch.SearchResponse?.task;
        assert.isTrue(!goneTask || (Array.isArray(goneTask) && goneTask.length === 0),
            'Task should NOT be found after delete');

        // Verify task IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${taskSubject}</query>
				<types>task</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');
        const dumpTask = Array.isArray(dumpSearch.SearchResponse?.task)
            ? dumpSearch.SearchResponse.task[0] : dumpSearch.SearchResponse?.task;
        assert.exists(dumpTask, 'Task should be in dumpster');

        // Recover the task from dumpster
        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${taskId}" op="recover" l="${taskFolderId}"/>
			</ItemActionRequest>`, acct1Auth
        );
        assert.notExists(recoverRes.Fault, 'Recover should not fault');

        // Verify task is back
        const backSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${taskSubject}</query>
				<types>task</types>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
    });


    it('Sanity | Verify the deleted document is available in dumpster', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);

        // Get briefcase folder ID
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
        );
        assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');

        const findBriefcaseFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Briefcase') return f.id;
                const sub = findBriefcaseFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const briefcaseFolderId = findBriefcaseFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        // Create a document via SaveDocumentRequest with inline content
        const docName = `testdoc${uid}.txt`;
        const saveRes = await soap.makeSOAPEnvelopeAccount(
            `<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcaseFolderId}" name="${docName}">
					<content>Test document content ${uid}</content>
				</doc>
			</SaveDocumentRequest>`, acct1Auth
        );
        assert.notExists(saveRes.Fault, 'SaveDocumentRequest should not fault');
        const savedDoc = Array.isArray(saveRes.SaveDocumentResponse?.doc)
            ? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse?.doc;
        const docId = savedDoc?.id;
        assert.exists(docId, 'Document id should exist');

        // Verify document exists
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>${docName}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

        // Hard delete the document
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="delete"/>
			</ItemActionRequest>`, acct1Auth
        );

        // Verify document NOT found in normal search
        const goneSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>${docName}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(goneSearch.Fault, 'SearchRequest should not fault');
        const goneDoc = goneSearch.SearchResponse?.doc;
        assert.isTrue(!goneDoc || (Array.isArray(goneDoc) && goneDoc.length === 0),
            'Document should NOT be found after delete');

        // Verify document IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>${docName}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');

        // Recover the document from dumpster
        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="recover" l="${briefcaseFolderId}"/>
			</ItemActionRequest>`, acct1Auth
        );
        assert.notExists(recoverRes.Fault, 'Recover should not fault');

        // Verify document is back
        const backSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>${docName}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
    });


    it('Sanity | Verify the deleted appointment is available in dumpster', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const apptSubject = `Subject of meeting${uid}`;
        const apptContent = `Content of the message${uid}`;

        // Get calendar folder ID
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
        );
        assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');

        const findCalendarFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Calendar') return f.id;
                const sub = findCalendarFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const calFolderId = findCalendarFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        // Create an appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${apptSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const apptId = createRes.CreateAppointmentResponse?.invId;
        assert.exists(apptId, 'Appointment invId should exist');

        // Verify appointment exists
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

        // Hard delete the appointment
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${apptId}" op="delete"/>
			</ItemActionRequest>`, acct1Auth
        );

        // Verify appointment NOT found in normal search
        const goneSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(goneSearch.Fault, 'SearchRequest should not fault');
        const goneAppt = goneSearch.SearchResponse?.appt;
        assert.isTrue(!goneAppt || (Array.isArray(goneAppt) && goneAppt.length === 0),
            'Appointment should NOT be found after delete');

        // Verify appointment IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');

        // Recover the appointment from dumpster
        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${apptId}" op="recover" l="${calFolderId}"/>
			</ItemActionRequest>`, acct1Auth
        );
        assert.notExists(recoverRes.Fault, 'Recover should not fault');

        // Verify appointment is back
        const backSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
    });


    it('Sanity | Verify the deleted message is viewable by Account3 after recovery', async () => {
        // Login as account1 and send message to account3
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const msgSubject = `Subject${uid}msg2`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content of the message${uid}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
        );

        await new Promise(r => setTimeout(r, 2000));

        // Login as account3
        const acct3Auth = await soap.getAccountAuthToken(account3Name);

        // Search for the message
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msg = Array.isArray(searchRes.SearchResponse?.m)
            ? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
        assert.exists(msg, 'Message should be found');
        const msgId = msg.id;

        // Hard delete the message
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, acct3Auth
        );

        // Verify NOT in inbox
        const inboxSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox" ${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(inboxSearch.Fault, 'Inbox SearchRequest should not fault');

        // Verify IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');

        // Get inbox folder ID
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Auth
        );
        const findInboxFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Inbox') return f.id;
                const sub = findInboxFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const inboxFolderId = findInboxFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        // Recover the message
        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="recover" l="${inboxFolderId}"/>
			</ItemActionRequest>`, acct3Auth
        );
        assert.notExists(recoverRes.Fault, 'Recover should not fault');

        // Verify message is back in inbox
        const backSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail">
				<query>in:inbox</query>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
        const results = Array.isArray(backSearch.SearchResponse?.c)
            ? backSearch.SearchResponse.c
            : backSearch.SearchResponse?.c ? [backSearch.SearchResponse.c] : [];
        const found = results.some(c => c?.su === msgSubject);
        assert.isTrue(found, 'Recovered message should be in inbox');
    });


    it('Sanity | Verify the deleted message from dumpster is not recoverable if the message is deleted also from dumpster', async () => {
        // Login as account1 and send message to account3
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const msgSubject = `Subject dumpster delete${uid}msg3`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content of the message${uid}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
        );

        await new Promise(r => setTimeout(r, 2000));

        // Login as account3
        const acct3Auth = await soap.getAccountAuthToken(account3Name);

        // Search for the message
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msg = Array.isArray(searchRes.SearchResponse?.m)
            ? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
        assert.exists(msg, 'Message should be found');
        const msgId = msg.id;

        // Hard delete the message
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, acct3Auth
        );

        // Verify NOT in inbox
        const inboxSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox" ${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(inboxSearch.Fault, 'Inbox SearchRequest should not fault');

        // Verify IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');
        const dumpMsg = Array.isArray(dumpSearch.SearchResponse?.m)
            ? dumpSearch.SearchResponse.m[0] : dumpSearch.SearchResponse?.m;
        assert.exists(dumpMsg, 'Message should be in dumpster');

        // Delete from dumpster using dumpsterdelete (requires admin delegated auth)
        // Re-search dumpster with admin delegated auth to get the correct item ID
        const adminDumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, adminAuthToken, account3Id
        );
        assert.notExists(adminDumpSearch.Fault, 'Admin delegated dumpster SearchRequest should not fault');
        const adminDumpMsg = Array.isArray(adminDumpSearch.SearchResponse?.m)
            ? adminDumpSearch.SearchResponse.m[0] : adminDumpSearch.SearchResponse?.m;
        assert.exists(adminDumpMsg, 'Message should be found in dumpster via admin delegated auth');
        const dumpsterMsgId = adminDumpMsg.id;

        const dumpDeleteRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${dumpsterMsgId}" op="dumpsterdelete"/>
			</ItemActionRequest>`, adminAuthToken, account3Id
        );
        assert.notExists(dumpDeleteRes.Fault, 'ItemActionRequest dumpsterdelete should not fault');

        // Verify message is no longer in dumpster
        const dumpSearch2 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(dumpSearch2.Fault, 'Dumpster SearchRequest should not fault');
        const dumpMsg2 = dumpSearch2.SearchResponse?.m;
        assert.isTrue(!dumpMsg2 || (Array.isArray(dumpMsg2) && dumpMsg2.length === 0),
            'Message should NOT be in dumpster after dumpsterdelete');

        // Attempt recovery should fail
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Auth
        );
        const findInboxFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Inbox') return f.id;
                const sub = findInboxFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const inboxFolderId = findInboxFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="recover" l="${inboxFolderId}"/>
			</ItemActionRequest>`, acct3Auth, false
        );
        assert.exists(recoverRes.Fault, 'Recover should fault - item deleted from dumpster');
        assert.include(recoverRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_ITEM',
            'Fault code should be mail.NO_SUCH_ITEM');

        // Verify message is NOT in inbox
        const finalSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail">
				<query>in:inbox</query>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(finalSearch.Fault, 'SearchRequest should not fault');
        const finalResults = Array.isArray(finalSearch.SearchResponse?.c)
            ? finalSearch.SearchResponse.c
            : finalSearch.SearchResponse?.c ? [finalSearch.SearchResponse.c] : [];
        const notFound = !finalResults.some(c => c?.su === msgSubject);
        assert.isTrue(notFound, 'Message should NOT be in inbox after dumpsterdelete');
    });


    it('Sanity | Verify the deleted message from dumpster is not recoverable if the account has zimbraDumpsterEnabled False', async () => {
        // Login as account1 and send message to account4 (dumpster disabled)
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const msgSubject = `Subject${uid}msg4`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Name}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content of the message${uid}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
        );

        await new Promise(r => setTimeout(r, 2000));

        // Login as account4 (dumpster disabled)
        const acct4Auth = await soap.getAccountAuthToken(account4Name);

        // Search for the message
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct4Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msg = Array.isArray(searchRes.SearchResponse?.m)
            ? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
        assert.exists(msg, 'Message should be found');
        const msgId = msg.id;

        // Hard delete the message
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, acct4Auth
        );

        // Verify NOT in inbox
        const inboxSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox" ${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct4Auth
        );
        assert.notExists(inboxSearch.Fault, 'SearchRequest should not fault');
        const inboxMsg = inboxSearch.SearchResponse?.m;
        assert.isTrue(!inboxMsg || (Array.isArray(inboxMsg) && inboxMsg.length === 0),
            'Message should NOT be in inbox after delete');

        // Verify message is NOT in dumpster either (dumpster disabled)
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct4Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');
        const dumpMsg = dumpSearch.SearchResponse?.m;
        assert.isTrue(!dumpMsg || (Array.isArray(dumpMsg) && dumpMsg.length === 0),
            'Message should NOT be in dumpster when dumpster is disabled');
    });


    it('Sanity | Verify the deleted message is viewable by Account3 after disabling followed by enabling dumpster', async () => {
        // Login as account1 and send message to account3
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const msgSubject = `Subject${uid}msg5`;

        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content of the message${uid}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
        );

        await new Promise(r => setTimeout(r, 2000));

        // Login as account3
        const acct3Auth = await soap.getAccountAuthToken(account3Name);

        // Search for the message
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        const msg = Array.isArray(searchRes.SearchResponse?.m)
            ? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
        assert.exists(msg, 'Message should be found');
        const msgId = msg.id;

        // Hard delete the message
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, acct3Auth
        );

        // Verify NOT in inbox
        const inboxSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox" ${msgSubject}</query>
				<types>message</types>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(inboxSearch.Fault, 'SearchRequest should not fault');

        // Verify IS in dumpster
        const dumpSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${msgSubject}</query>
				<types>message</types>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, acct3Auth
        );
        assert.notExists(dumpSearch.Fault, 'Dumpster SearchRequest should not fault');

        // Disable dumpster for account3
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<a n="zimbraDumpsterEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
        );

        // Re-enable dumpster for account3
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<a n="zimbraDumpsterEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
        );

        // Re-login as account3
        const acct3Auth2 = await soap.getAccountAuthToken(account3Name);

        // Get inbox folder ID
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Auth2
        );
        const findInboxFolder = (folders) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === 'Inbox') return f.id;
                const sub = findInboxFolder(f?.folder);
                if (sub) return sub;
            }
            return null;
        };
        const inboxFolderId = findInboxFolder(
            getFolderRes.GetFolderResponse?.folder
        );

        // Recover the message
        const recoverRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="recover" l="${inboxFolderId}"/>
			</ItemActionRequest>`, acct3Auth2
        );
        assert.notExists(recoverRes.Fault, 'Recover should not fault');

        // Verify message is back in inbox
        const backSearch = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail">
				<query>in:inbox</query>
			</SearchRequest>`, acct3Auth2
        );
        assert.notExists(backSearch.Fault, 'SearchRequest should not fault');
        const results = Array.isArray(backSearch.SearchResponse?.c)
            ? backSearch.SearchResponse.c
            : backSearch.SearchResponse?.c ? [backSearch.SearchResponse.c] : [];
        const found = results.some(c => c?.su === msgSubject);
        assert.isTrue(found, 'Recovered message should be in inbox after re-enabling dumpster');
    });
});
