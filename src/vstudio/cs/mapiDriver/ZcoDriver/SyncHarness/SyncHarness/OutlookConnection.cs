using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace SyncHarness
{
    public class OutlookConnection
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public Microsoft.Office.Interop.Outlook.Application application
        {
            get
            {

                #region Make sure the connection is still available
                
                try
                {
                    // Just execute a simple command
                    Microsoft.Office.Interop.Outlook.Explorers explorers = _OutlookApplication.Explorers;
                    explorers = null;
                }
                catch (System.Exception e)
                {
                    throw new HarnessException("_OutlookApplication threw an exception", e);
                }

                #endregion

                return (_OutlookApplication);
            }
        }

        public Microsoft.Office.Interop.Outlook.NameSpace nameSpace
        {
            get
            {

                #region Make sure the connection is still available

                try
                {
                    bool offline = _OutlookNameSpace.Offline;
                }
                catch (System.Exception e)
                {
                    throw new HarnessException("_OutlookNameSpace threw an exception", e);
                }

                #endregion

                return (_OutlookNameSpace);
            }
        }


        #region IDisposable Members

        #endregion



        #region Singleton

        private Microsoft.Office.Interop.Outlook.Application _OutlookApplication = null;
        private Microsoft.Office.Interop.Outlook.NameSpace _OutlookNameSpace = null;

        private static OutlookConnection instance;

        private static readonly Object mutex = new Object();

        private OutlookConnection() 
        {
            log.Debug("OutlookConnection: ...");

            log.Info("TRACE: " + statusString());

            try
            {
                _OutlookApplication = new Microsoft.Office.Interop.Outlook.ApplicationClass();
            }
            catch (System.Exception e)
            {
                throw new HarnessException("OutlookConnection threw exception for _OutlookApplication", e);
            }


            try
            {
                _OutlookNameSpace = _OutlookApplication.GetNamespace("MAPI");
                _OutlookNameSpace.Logon(null, null, false, false); // Assume OUTLOOK.EXE was already started by OutlookProfile
            }
            catch (System.Exception e)
            {
                throw new HarnessException("OutlookConnection threw exception for _OutlookNameSpace", e);
            }

            log.Info("TRACE: " + statusString());

            log.Debug("OutlookConnection: ... done");
        }

        public static OutlookConnection Instance
        {
            get
            {
               lock(mutex)
                   return (instance == null ? (instance = new OutlookConnection()) : instance);
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

                if (instance._OutlookNameSpace != null)
                {

                    // TODO: _OutlookNameSpace.Logoff() can throw the following exception.  Should we handle it?
                    // 01-26-10 16:53:08,405 ERROR ClientTests.GlobalSetupFixture: Uncaught exception in TearDown
                    //System.Runtime.InteropServices.COMException (0x800706BA): The RPC server is unavailable. (Exception from HRESULT: 0x800706BA)
                    //   at Microsoft.Office.Interop.Outlook.NameSpaceClass.Logoff()
                    //   at SyncHarness.OutlookConnection.Dispose() in C:\P4\matt\main\ZimbraQA\src\vstudio\cs\mapiDriver\ZcoDriver\ZcoDriver\SyncHarness\OutlookConnection.cs:line 33
                    //   at ClientTests.GlobalSetupFixture.TearDown() in C:\P4\matt\main\ZimbraQA\src\vstudio\cs\mapiDriver\ZcoDriver\ClientTests\NUnit\GlobalSetupFixture.cs:line 119
                    try
                    {
                        instance._OutlookNameSpace.Logoff();
                    }
                    catch (System.Exception e)
                    {
                        log.Warn("_OutlookNameSpace.Logoff() threw an exception", e);
                    }
                    instance._OutlookNameSpace = null;

                }

                if (instance._OutlookApplication != null)
                {

                    try
                    {
                        ((Microsoft.Office.Interop.Outlook._Application)(instance._OutlookApplication)).Quit();
                    }
                    catch (System.Exception e)
                    {
                        log.Warn("_OutlookApplication.Quit() threw an exception", e);
                    }
                    instance._OutlookApplication = null;

                }

                log.Info("TRACE: " + instance.statusString());

                instance = null;
            
            }

            log.Debug("Dispose: GC collection ...");

            GC.Collect();
            GC.WaitForPendingFinalizers();

            log.Debug("Dispose: GC collection ... done");


            log.Info("Destroy ... done");


        }

        private String statusString()
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("_OutlookApplication: (").Append(_OutlookApplication).Append(") ");
            sb.Append("_OutlookNameSpace: (").Append(_OutlookNameSpace).Append(") ");
            return (sb.ToString());
        }

        #endregion




    }

}
