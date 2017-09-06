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
using System.IO;
using System.Net;
using System.Text;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using log4net;
using NUnit.Framework;
using EASHarness.SOAP.Admin;
using EASHarness.NUnit;
using EASHarness.Harness;
using EASHarness.ActiveSync.HTTP;

namespace EASHarness.Debugging
{
    [TestFixture]
    public class UnitTests : BaseTestFixture
    {
        #region Test: Name Resolution Failure
        [Test, Description("Debug test method to check for \"NameResolutionFailure\" in response to a DNS lookup failure.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on MS-ASHTTP Options Request... ",
            "Check for NameResolutionFailure!")]
        [Notes("This debug test method checks for \"NameResolutionFailure\" in response to a DNS lookup failure.")]
        public void NameResolutionFailure()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Test Account Credentials
            string EmailAddress = "user@foo.local";
            string Password = "test123";
            string MailHost = "mail.foo.local";

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.DebugAuthCredentials(EmailAddress, Password, MailHost);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            TestDevice.ConfigureDevice();

            // Verify that "NameResolutionFailure" is returned in response to a DNS lookup failure
            zAssert.AreEqual("NameResolutionFailure", TestDevice.ResponseStatusMessage, "WebException Status Message");
        }
        #endregion

        #region Test: Connect Failure
        /* Note: To run this debug test:
         * [1]. Login to the Zimbra Server.
         * [2]. Execute the command "zmmailboxdctil stop" as "zimbra" user.
         * [3]. Ensure that "mailboxd service" is stopped ("zmcontrol status" as "zimbra" user).
         * [4]. Once the test is completed, execute the command "zmmailboxdctil start" as "zimbra" user.
         * [5]. Ensure that "mailboxd service" is started ("zmcontrol status" as "zimbra" user).
         */

        [Test, Description("Debug test method to check for \"ConnectFailure\" if a server is not reachable at the specified address or port is not open.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on MS-ASHTTP Options Request... ",
            "Check for ConnectFailure!")]
        [Notes("This debug test method checks for \"ConnectFailure\" if a server is not reachable at the specified address or port is not open.")]
        public void ConnectFailure()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Test Account Credentials
            string EmailAddress = "user@" + Properties.getProperty("defaultdomain.name");
            string Password = Properties.getProperty("defaultpassword.value");
            string MailHost = Properties.getProperty("zimbraServer.name");

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.DebugAuthCredentials(EmailAddress, Password, MailHost);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            TestDevice.ConfigureDevice();

            // Verify that "ConnectFailure" is returned if a server is not reachable at the specified address or port is not open
            zAssert.AreEqual("ConnectFailure", TestDevice.ResponseStatusMessage, "WebException Status Message");
        }
        #endregion

        #region Test: Authentication Failure
        [Test, Description("Debug test method to check for \"HTTP 1.1/401 ProtocolError\" for authentication failure.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on MS-ASHTTP Options Request... ",
            "Check for HTTP 1.1/401 ProtocolError!")]
        [Notes("This debug test method checks for \"HTTP 1.1/401 ProtocolError\" for authentication failure.")]
        public void ProtocolError401()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Test Account Credentials
            string EmailAddress = "user@" + Properties.getProperty("defaultdomain.name");
            string Password = Properties.getProperty("defaultpassword.value");
            string MailHost = Properties.getProperty("zimbraServer.name");

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.DebugAuthCredentials(EmailAddress, Password, MailHost);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            TestDevice.ConfigureDevice();

            // Verify that "HTTP 1.1/401 ProtocolError" is returned for authentication failure
            zAssert.AreEqual(401, TestDevice.ResponseStatusCode, "WebResponse Status Code");
            zAssert.AreEqual("ProtocolError", TestDevice.ResponseStatusMessage, "WebException Status Message");
        }
        #endregion

        #region Test: Configure Device with Primary Account Details 

        // TBD: Add assertions for various intermediate MS-ASCMD Request/Response Phases using a Primary EAS Account

        [Test, Description("Debug test method to check for configuration of an ActiveSync device.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on EASDevice.ConfigureDevice()",
            "Check for successful execution of various MS-ASCMD requests!")]
        [Notes("Debug test method to check for configuration of an ActiveSync device.")]
        public void ConfigureDevice_PrimaryAccountAuth()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Create an TestUser Account on the ZCS Server
            zAccount testUser = zAccount.AccountEAS;

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.PrimaryAuthCredentials(testUser);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            TestDevice.ConfigureDevice();
        }
        #endregion

        #region Test: Configure Device with Alias Account Details

        // TBD: Add assertions for various intermediate MS-ASCMD Request/Response Phases using an Alias EAS Account

        [Test, Description("Debug test method to check for AliasAccount Login.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on EASDevice.ConfigureDevice()",
            "Check for successful device configuration using Alias Account credentials")]
        [Notes("This debug test method checks for Alias Account Login.")]
        public void ConfigureDevice_AliasAccountAuth()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Create an TestUser Account on the ZCS Server
            zAccount testUser = zAccount.AccountEAS;

            // Create an Alias ID for the TestUser
            testUser.addAlias(string.Format("aliasEAS{0}{1}", Properties.time(), Properties.counter()));

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.AliasAuthCredentials(testUser);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            TestDevice.ConfigureDevice();
        }
        #endregion

        #region Test: Configure Device using Windows Domain Authentication Mechanism

        // TBD: Add assertions for various intermediate MS-ASCMD Request/Response Phases for a Primary EAS Account using Windows Domain Auth

        [Test, Description("Debug test method to check for Windows Domain Login.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on EASDevice.ConfigureDevice()",
            "Check for successful device configuration using Windows Domain Authentication")]
        [Notes("This debug test method checks for Windows Domain Login.")]
        public void ConfigureDevice_WindowsDomainAuth()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Create an TestUser Account on the ZCS Server
            zAccount testUser = zAccount.AccountEAS;

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.PrimaryAuthCredentials(testUser);

            // Configure the TestUser Account on the device. This will provision the device on the server.
            // We override the default UPNAuth (TRUE) with FALSE; so as to send out the authentication in the "domain\username" format
            TestDevice.ConfigureDevice(false);
        }
        #endregion

        #region Test: Remote Wipe Functionality

        // TBD: Add assertions for various intermediate MS-ASCMD Request/Response Phases using a Primary EAS Account

        [Test, Description("Debug test method to check for remote wiping of an activesync device.")]
        [Category("DEBUG")]
        [SyncDirection(SyncDirection.NoSync)]
        [TestSteps(
            "Unit Testing MobileSyncHarness... ",
            "Working on EASDevice.ConfigureDevice()",
            "Check for successful remote wiping of an activesync device!")]
        [Notes("Debug test method to check for remote wiping of an activesync device.")]
        public void RemoteWipe()
        {
            // Initiaize at the start of each Unit Test
            initialize(System.Reflection.MethodBase.GetCurrentMethod());

            // Create an TestUser Account on the ZCS Server
            zAccount testUser = zAccount.AccountEAS;

            // Initialize a Generic Device Instance
            EASDevice TestDevice = new EASDevice();
            TestDevice.DeviceInfo(EASDevice.Device.Generic);

            // Configure auth credentials on the device
            TestDevice.PrimaryAuthCredentials(testUser);

            // Configure the TestUser Account on the device. (This will provision the device on the server)
            TestDevice.ConfigureDevice();

            // TBD: Send Zimbra SOAP request to initiate a remote wipe

            // Soft Reset the device
            TestDevice.SoftReset();

            // Configure the TestUser Account on the device once again. This will trigger a hard-reset on the device.
            TestDevice.ConfigureDevice();
        }
        #endregion
    }
}