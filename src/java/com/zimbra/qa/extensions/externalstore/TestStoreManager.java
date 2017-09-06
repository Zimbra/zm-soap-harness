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
public class TestStoreManager extends ExternalStoreManager {

    String directory = "/tmp/testblobstore";

    @Override
    public void startup() throws IOException, ServiceException {
        super.startup();
        ZimbraLog.store.info("Using TestStoreManager");
        FileUtil.mkdirs(new File(directory));
    }

    private String dirName(Mailbox mbox) {
        return directory + "/" + mbox.getAccountId();
    }

    private File getNewFile(Mailbox mbox) throws IOException {
        String baseName = dirName(mbox);
        FileUtil.mkdirs(new File(baseName));
        baseName += "/zimbrablob";
        String name = baseName;
        synchronized (this) {
            int count = 1;
            File file = new File(name+".msg");
            while (file.exists()) {
                name = baseName+"_"+count++;
                file = new File(name+".msg");
            }
            if (file.createNewFile()) {
                ZimbraLog.store.debug("writing to a new file %s",file.getName());
                return file;
            } else {
                throw new IOException("unable to create new file");
            }
        }
    }

    @Override
    public String writeStreamToStore(InputStream in, long actualSize, Mailbox mbox) throws IOException {
        File destFile = getNewFile(mbox);
        FileUtil.copy(in, false, destFile);
        ZimbraLog.store.debug("file location is %s  ",destFile.getCanonicalPath());
        return destFile.getCanonicalPath();
    }

    @Override
    public InputStream readStreamFromStore(String locator, Mailbox mbox) throws IOException {
    	
        return new FileInputStream(locator);
    }

    @Override
    public boolean deleteFromStore(String locator, Mailbox mbox) throws IOException {
    	File deleteFile = new File(locator);       
        boolean result=  deleteFile.delete();
        ZimbraLog.store.debug("Deleting the %s file and result is %d",deleteFile.getName(), result);
        return result;
    }

 
}
