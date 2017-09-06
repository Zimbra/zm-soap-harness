/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * Developer: Arindam Bhattacharya
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;

namespace EASHarness.ActiveSync.HTTP
{
    class EncodedCredentials
    {
        // Auth Format - "username@domain:password"
        public string getEncodedCredentials(string EmailAddress, string Password)
        {
            string strRawCredentials = EmailAddress + ":" + Password;

            System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();
            Byte[] byteSource = encoding.GetBytes(strRawCredentials);

            string strEncodedCredentials = System.Convert.ToBase64String(byteSource);

            return strEncodedCredentials;
        }

        // Auth Format - "domain\username:password"
        public string getEncodedCredentials(string Username, string Password, string Domain)
        {
            string strRawCredentials = Domain + "\\" + Username + ":" + Password;

            System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();
            Byte[] byteSource = encoding.GetBytes(strRawCredentials);

            string strEncodedCredentials = System.Convert.ToBase64String(byteSource);

            return strEncodedCredentials;
        }
    }
}
