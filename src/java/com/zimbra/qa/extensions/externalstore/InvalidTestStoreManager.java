/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2012 Zimbra Software, LLC.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.4 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.qa.extensions.externalstore;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.FileUtil;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.store.external.*;;


/**
 * TestStoreManager which writes blobs to a flat directory structure, this will test sdk API
 
 */
public class InvalidTestStoreManager extends ExternalStoreManager {

   
    @Override
    public void startup() throws IOException, ServiceException {
        super.startup();
        ZimbraLog.store.info("Using InvalidTestStoreManager");      
    }
   

    @Override
    public String writeStreamToStore(InputStream in, long actualSize, Mailbox mbox) throws IOException { 
    	ZimbraLog.store.debug(" InvalidTestStoreManager writeStreamToStore return null location");
        return null;
    }

    @Override
    public InputStream readStreamFromStore(String locator, Mailbox mbox) throws IOException {
    	ZimbraLog.store.debug("InvalidTestStoreManager readStreamFromStore return null inputstream");
        return null;
    }

    @Override
    public boolean deleteFromStore(String locator, Mailbox mbox) throws IOException {  
    	ZimbraLog.store.debug("InvalidTestStoreManager Deleting return false");
        return false;
    }

   
}
