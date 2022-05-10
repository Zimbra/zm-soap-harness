/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.qa.extensions.auth;

import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.zimbra.common.service.ServiceException;
import com.zimbra.cs.account.Account;
import com.zimbra.cs.account.AccountServiceException;
import com.zimbra.cs.account.AccountServiceException.AuthFailedServiceException;
import com.zimbra.cs.account.auth.AuthMechanism;
import com.zimbra.cs.account.auth.ZimbraCustomAuth;
import com.zimbra.cs.extension.ExtensionDispatcherServlet;
import com.zimbra.cs.extension.ZimbraExtension;

public class ExtensionCustomAuthQA implements ZimbraExtension {

    private static Logger mLog = LogManager.getLogger(ExtensionCustomAuthQA.class.getName());
    
    private static final String EXTENSION_NAME = "ExtensionCustomAuthQA";
    
	public String getName() {
    	return EXTENSION_NAME;
    }
    
	public void init() throws ServiceException {
        /* 
         * Register to Zimbra's authentication infrastructure
         * 
         * custom:sample should be set for domain attribute zimbraAuthMech 
         */
        ZimbraCustomAuth.register(EXTENSION_NAME, new CustomAuthQA());
        }
	
	public void destroy() {
        ExtensionDispatcherServlet.unregister(this);
	}
    

    public class CustomAuthQA extends ZimbraCustomAuth {

        /*
         * Method invoked by the framework to handle authentication requests.
         * A custom auth implementation must implement this abstract method.
         * 
         * @param account: The account object of the principal to be authenticated
         *                 all attributes of the account can be retrieved from this object.
         *                   
         * @param password: Clear-text password.
         * 
         * @param context: Map containing context information.  
         *                 A list of context data is defined in com.zimbra.cs.account.AuthContext
         * 
         * @param args: Arguments specified in the zimbraAuthMech attribute
         * 
         * @return Returning from this function indicating the authentication has succeeded. 
         *  
         * @throws Exception.  If authentication failed, an Exception should be thrown.
         */
        public void authenticate(Account account, String password, Map<String, Object> authCtxt, List<String> args) throws Exception {
            
        	String id = account.getId(); // 4d5baddc-c64c-4c61-a0cc-5af4926f151e
        	String address = account.getName(); // user@domain.com
        	String foreignPrincipal = account.getAttr("zimbraForeignPrincipal", "");
        	
        	mLog.info("CustomAuthQA: " + id);
        	mLog.info("CustomAuthQA: " + address);
        	mLog.info("CustomAuthQA: " + foreignPrincipal);
        	
        	if (password.equalsIgnoreCase("Exception")) {
        		throw new Exception("CustomAuthQA: Generic Exception");
        	}

        	if (password.equalsIgnoreCase("AUTH_FAILED")) {
        		throw AuthFailedServiceException.AUTH_FAILED(account.getName(), AuthMechanism.namePassedIn(authCtxt), (Throwable)null);
        	}

        	if (password.equalsIgnoreCase("CHANGE_PASSWORD")) {
        		throw AccountServiceException.CHANGE_PASSWORD();
        	}

        	mLog.info("CustomAuthQA: success!");
        	
        }
    } 
    
}
