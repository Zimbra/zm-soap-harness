using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using log4net;
using System.Xml;
using System.IO;
using Soap;
using SoapWebClient;


namespace SyncHarness
{
    public class OutlookRedemption 
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        
        public enum mailReplyType
        {
            reply = 0,
            replyAll = 1,
            forward = 2,
        }



        public RDOSession rdoSession
        {
            get
            {

                #region Make sure the connection is still available

                try
                {
                    RDOAddressEntry e = _RDOSession.CurrentUser;
                }
                catch (System.Exception e)
                {
                    throw new HarnessException("_RDOSession threw exception", e);
                }

                #endregion

                return (_RDOSession);
            }
            
        }

        public MAPIUtils mapiUtils
        {
            get
            {
                #region Make sure the connection is still available

                try
                {
                    long property = _MAPIUtils.GetIDsFromNames(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8000, false);
                }
                catch (System.Exception e)
                {
                    throw new HarnessException("_MAPIUtils threw exception", e);
                }

                #endregion

                return (_MAPIUtils);
            }
        }


        public int getInitialSyncValue()
        {

            long namedPropertySync = mapiUtils.GetIDsFromNames(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8000, false);
            namedPropertySync = ((namedPropertySync & 0xFFFF0000) | 0x00000002);
            log.DebugFormat("getInitialSyncValue: namedPropertySync {0}(0x{1:x8})", namedPropertySync, namedPropertySync);

            int syncInt = 0;

            object syncObject = OutlookRedemption.Instance.mapiUtils.HrGetOneProp(rdoSession.Stores.DefaultStore, (int)namedPropertySync);

            if (syncObject == null)
            {
                log.Debug("getInitialSyncValue: syncObject does not exist.  Using value '0'");
            }
            else
            {
                syncInt = (int)syncObject;
            }


            log.Debug("getInitialSyncValue: syncInt " + syncInt);
            return (syncInt);
        }

        public bool getDeltaSyncValue()
        {

            long namedPropertySync = mapiUtils.GetIDsFromNames(OutlookRedemption.Instance.rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8002, false);
            namedPropertySync = ((namedPropertySync & 0xFFFF0000) | 0x0000000b);
            log.DebugFormat("getDeltaSyncValue: namedPropertySync {0}(0x{1:x8})", namedPropertySync, namedPropertySync);

            bool syncBool = false;

            object syncObject = mapiUtils.HrGetOneProp(rdoSession.Stores.DefaultStore, (int)namedPropertySync);

            if (syncObject == null)
            {
                log.Debug("getDeltaSyncValue: syncObject does not exist.  Using value '0'");
            }
            else
            {
                syncBool = (bool)syncObject;
            }

            log.Debug("getDeltaSyncValue: syncBool " + syncBool);
            return (syncBool);
        }

        /*
        public string getSyncTokenValueForStore(Redemption.RDOStore store)
        {
            if (store == null)
                store = OutlookRedemption.Instance.rdoSession.Stores.DefaultStore;

            long namedPropertySyncToken = mapiUtils.GetIDsFromNames( store, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8001, false);
            namedPropertySyncToken = ((namedPropertySyncToken & 0xFFFF0000) | 0x0000001f);
            log.DebugFormat("getDeltaSyncValue: namedPropertySyncToken {0}(0x{1:x8})", namedPropertySyncToken, namedPropertySyncToken);

            string syncToken = "";

            object syncObject = mapiUtils.HrGetOneProp( store, (int)namedPropertySyncToken);

            if (syncObject == null)
            {
                log.Debug("getSyncTokenValue: syncObject does not exist.  Using value ''");
            }
            else
            {
                syncToken = (string)syncObject;
            }

            log.Debug("getSyncTokenValue: syncBool " + syncToken);
            return (syncToken);
        }
         */

        public bool isGalSyncInProgress()
        {

            long namedPropertySync = mapiUtils.GetIDsFromNames(rdoSession.Stores.DefaultStore, "{20022104-6842-430D-B19C-8739BFDB9188}", 0x8004, false);
            namedPropertySync = ((namedPropertySync & 0xFFFF0000) | 0x0000000b);
            log.DebugFormat("getGalSyncValue: namedPropertySync {0}(0x{1:x8})", namedPropertySync, namedPropertySync);

            bool syncBool = false;

            object syncObject = mapiUtils.HrGetOneProp(rdoSession.Stores.DefaultStore, (int)namedPropertySync);

            if (syncObject == null)
            {
                log.Debug("getGalSyncValue: syncObject does not exist.  Using value '0'");
                syncBool = true;
            }
            else
            {
                syncBool = (bool)syncObject;
            }

            log.Debug("getGalSyncValue: syncBool " + syncBool);
            return (syncBool);
        }

        public RDOStore getDefaultStore()
        {
            RDOStore s = rdoSession.Stores.DefaultStore;
            return (s);
        }

        public RDOFolder getRootFolder()
        {
            RDOFolder f = getDefaultStore().RootFolder;
            return (f);
        }

        public RDOFolder getIPMRootFolder()
        {
            RDOFolder f = getDefaultStore().IPMRootFolder;
            return (f);
        }

        public RDOFolder getRootGlobalAddressList()
        {
            int count = getRootFolder().Items.Count;
            foreach (RDOFolder f in getRootFolder().Folders)
            {
                if (f.Name.Equals("Global Address List"))
                    return (f);
            }
            log.Warn("Unable to determine Root Global Address List Folder");
            return (null);
        }

        public RDOFolder getRootContacts()
        {
            int count = getIPMRootFolder().Items.Count;
            foreach (RDOFolder f in getIPMRootFolder().Folders)
            {
                if (f.Name.Equals("Contacts"))
                    return (f);
            }
            log.Warn("Unable to determine Contacts Folder");
            return (null);
        }



        #region Singleton methods

        private RDOSession _RDOSession = null;
        private MAPIUtils _MAPIUtils = null;

        private static OutlookRedemption instance = null;

        private static readonly Object mutex = new Object();

        private OutlookRedemption()
        {
            log.Debug("OutlookRedemption ...");

            log.Info("TRACE: " + statusString());

            // From http://www.dimastr.com/redemption/rdo/rdosession.htm
            // Important note: if you set this property to Namespace.MAPIOBJECT 
            // property from the Outlook Object Model and your code is running 
            // outside the outlook.exe address space (i.e. it is not a COM add-in) 
            // some RDO features (RDOFolder.ACL, RDOPSTStore.PstPath, 
            // GetSharedDefaultFolder, GetSharedMailbox, etc) will not function
            // properly due to bugs in the MAPI COM marshaling support.
            //
            //_RDOSession.Logon(null, null, false, false, false, false);
            try
            {
                _RDOSession = new Redemption.RDOSessionClass();
                _RDOSession.MAPIOBJECT = OutlookConnection.Instance.nameSpace.MAPIOBJECT;
                _MAPIUtils = new MAPIUtils();
            }
            catch (System.Exception e)
            {
                throw new HarnessException("OutlookRedemption threw exception for _RDOSession", e);
            }

            log.Info("TRACE: " + statusString());

            log.Debug("OutlookRedemption ... done");
        }


        public static OutlookRedemption Instance
        {
            get
            {
                lock(mutex)
                    return instance == null ? (instance = new OutlookRedemption()) : instance;
            }
        }

        public static void Destroy()
        {
            log.Info("Destroy ...");

            if (instance == null)
            {
                log.Info("Destroy: no instance to destroy");
            }
            else
            {
                log.Info("TRACE: " + instance.statusString());


                try
                {
                    if (instance._MAPIUtils != null)
                        instance._MAPIUtils.Cleanup();
                    instance._MAPIUtils = null;
                }
                catch (System.Exception e)
                {
                    log.Warn("_MAPIUtils.Cleanup() threw an exception", e);
                }

                // From http://www.dimastr.com/redemption/rdo/rdosession.htm
                // Important note: if you set this property to Namespace.MAPIOBJECT 
                // property from the Outlook Object Model and your code is running 
                // outside the outlook.exe address space (i.e. it is not a COM add-in) 
                // some RDO features (RDOFolder.ACL, RDOPSTStore.PstPath, 
                // GetSharedDefaultFolder, GetSharedMailbox, etc) will not function
                // properly due to bugs in the MAPI COM marshaling support.
                //
                //_RDOSession.Logoff();
                // TBD: Do we need to release the MAPIOBJECT pointer before deleting _RDOSession?
                try
                {   
                    // [25/1/2012] During automation run, when a test case fails(because of an exception), outlook suppose to close 
                    // and restart for the next case. However, in some automation runs, instead of closing, outlook hangs.
                    // It hangs after closing mapiutils and redemption processes. When I look at the task manager, outlook process is still running.
                    // So looks like somehow it is not able ot close outlook. One reason may be that MAPIOBJECT assigned to redemption never got released.
                    // Hence will try to release it and see if it solves the issue.
                    instance._RDOSession.MAPIOBJECT = null;
                    instance._RDOSession = null;

                 }
                catch (System.Exception e)
                {
                    log.Info("_RDOSession reset to null threw an exception", e);
                }

                    log.Info("TRACE: " + instance.statusString());
                try
                {
                    // Delete the singelton
                    instance = null;
                }
                catch (System.Exception e)
                {
                    log.Info(" threw an exception", e);
                }

            }

            log.Debug("Dispose: GC collection ...");
            try
            {

                GC.Collect();
                GC.WaitForPendingFinalizers();
            }
            catch (System.Exception e)
            {
                log.Info("GC threw an exception", e);
            }
            log.Debug("Dispose: GC collection ... done");

            log.Info("Destroy ... done");
        }

        private String statusString()
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("_RDOSession: (").Append(_RDOSession).Append(") ");
            sb.Append("_MAPIUtils: (").Append(_MAPIUtils).Append(")");
            return (sb.ToString());
        }

        #endregion





    }
}
