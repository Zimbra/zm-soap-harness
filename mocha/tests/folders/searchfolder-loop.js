import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder-Loop', function () {
    before(async function () {
        await main.before(this);
    });


    it('Functional | Searchfolder-Loop placeholder', async () => {
        // TODO: Implement tests from Searchfolder-Loop.xml
    });
});
