/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Text;
using System.Collections;
using System.Diagnostics;
using System.Net.Sockets;
using System.Collections.Generic;
using log4net;
using EASHarness.SOAP.Admin;

namespace EASHarness.Harness
{
    public class MailInject
    {
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        static public void injectLMTP(string mailHost, string fileOrFolder, ArrayList toAddresses, string fromAddress)
        {
            LmtpClient client = new LmtpClient(mailHost, 7025);

            if (Directory.Exists(fileOrFolder))
            {
                DirectoryInfo directoryInfo = new DirectoryInfo(fileOrFolder);

                foreach (FileInfo fileInfo in directoryInfo.GetFiles())
                {
                    zAssert.IsTrue(client.sendMessage(fileInfo.FullName, toAddresses, fromAddress, fileInfo.Name), "Verify that LMTP is delivered " + fileInfo.FullName);
                }
            }

            else if (File.Exists(fileOrFolder))
            {
                FileInfo fileInfo = new FileInfo(fileOrFolder);
                zAssert.IsTrue(client.sendMessage(fileInfo.FullName, toAddresses, fromAddress, fileInfo.Name), "Verify that LMTP is delivered " + fileInfo.FullName);
            }

            else
            {
                throw new HarnessException("Inject LMTP: " + fileOrFolder + " does not exist!");
            }

            // Wait for the messages to flush from the queue
            int delay = Int32.Parse(Properties.getProperty("postfixdelay.msec"));
            zAssert.IsTrue(MailInject.waitForPostfixQueue(delay / 1000, mailHost), "Check that the message queue is cleared... ");
        }

        static public bool waitForPostfixQueue(int delaySeconds, string mailHost)
        {
            MailInject mailInject = new MailInject();

            // Make sure a valid delay was set
            if (delaySeconds <= 0)
            {
                throw new HarnessException("WaitForPostfixQueue: Delay (in Secs) must be greater than 0 seconds");
            }

            if (!mailInject.initializeSTAF(mailHost))
            {
                tcLog.Warn("STAF is not running... Wait 5 seconds for mail to be delivered! ");
                System.Threading.Thread.Sleep(5000);
                return (true);
            }

            DateTime finish = DateTime.Now.AddSeconds(delaySeconds);
            tcLog.Debug("WaitForPostfixQueue: Waiting until " + finish + " for the mail queue to clear... ");
            do
            {
                if (mailInject.isPostfixQueueEmptySTAF(mailHost))
                {
                    return (true);
                }

                System.Threading.Thread.Sleep(1000);

            } while (DateTime.Now < finish);

            // Mail queue never cleared.  Flush it
            tcLog.Warn("WaitForPostfixQueue: Ran out of time... ");
            mailInject.clearPostfixQueueSTAF(mailHost);

            return (false);
        }

        private MailInject() {}

        private bool isPostfixQueueEmptySTAF(string mailHost)
        {
            string command = " process start shell command \"su - zimbra -c \\\"postqueue -p\\\"\" wait return stdout return stderr";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            tcLog.Info("STAF " + mailHost + command);
            tcLog.Info(output);

            return (output.Contains("Mail queue is empty!"));
        }

        private void clearPostfixQueueSTAF(string mailHost)
        {
            string command_postsuper = "/opt/zimbra/postfix/sbin/postsuper";
            string args_postsuper = "-d ALL";
            string command_staf = " process start shell command \"" + command_postsuper + "\" PARMS " + args_postsuper + " wait return stdout return stderr";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command_staf);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            tcLog.Info("STAF " + mailHost + command_staf);
            tcLog.Info(output);
        }

        private static bool isCheckedSTAF = false;
        private static bool isRunningSTAF = false;

        private bool initializeSTAF(string mailHost)
        {
            if (isCheckedSTAF)
            {
                // If we have already checked for staf, just return
                return (isRunningSTAF);
            }

            isCheckedSTAF = true;
            string command = " ping ping";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            tcLog.Warn("STAF " + mailHost + command);
            tcLog.Warn(output.Trim());

            return (isRunningSTAF = !output.Contains("Error registering with STAF"));
        }

        private bool isPostfixQueueEmptySOAP(string mailHost)
        {
            zAccountAdmin.GlobalAdminAccount.sendSOAP(new GetMailQueueInfoRequest().AddServerName(mailHost));

            //<GetMailQueueInfoResponse XmlNS="urn:zimbraAdmin">
            //  <server name="qa60.lab.zimbra.com">
            //    <queue n="1" name="active" />
            //    <queue n="0" name="deferred" />
            //    <queue n="0" name="corrupt" />
            //    <queue n="0" name="incoming" />
            //    <queue n="0" name="hold" />
            //  </server>
            //</GetMailQueueInfoResponse>

            System.Xml.XmlNode serverElement = zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:server[@name='" + mailHost + "']", null, null, null, 1);

            IEnumerator iEnumerator = serverElement.ChildNodes.GetEnumerator();

            while (iEnumerator.MoveNext())
            {
                System.Xml.XmlNode queueNode = iEnumerator.Current as System.Xml.XmlNode;
                if (queueNode.Attributes["n"] != null)
                {
                    if (Int32.Parse(queueNode.Attributes["n"].Value) > 0)
                        return false; // Found at least one item
                }
            }

            // No items in the queues
            return (true);
        }

        private void clearPostfixQueueSOAP(string mailHost)
        {
            // http://bugzilla.zimbra.com/show_bug.cgi?id=33713
            // soapTest.RequestResponseMethod(new SoapAdmin.MailQueueFlushRequest().AddServer(mailHost));
            // WORKAROUND - Use MailQueueActionRequest on the individual items

            int count;
            do
            {
                count = 0;

                zAccountAdmin.GlobalAdminAccount.sendSOAP(new GetMailQueueInfoRequest().AddServerName(mailHost));

                System.Xml.XmlNode serverElement = zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:server[@name='" + mailHost + "']", null, null, null, 1);

                IEnumerator ienum1 = serverElement.ChildNodes.GetEnumerator();

                while (ienum1.MoveNext())
                {
                    System.Xml.XmlNode queueNode = ienum1.Current as System.Xml.XmlNode;
                    int queueN = Int32.Parse(queueNode.Attributes["n"].Value);
                    string queueName = queueNode.Attributes["name"].Value;

                    if (queueN > 0)
                    {
                        System.Xml.XmlNode queueElement;

                        DateTime finish = DateTime.Now.AddSeconds(60);

                        do
                        {
                            zAccountAdmin.GlobalAdminAccount.sendSOAP(new GetMailQueueRequest().AddServer(mailHost, queueName));

                            queueElement = zAccountAdmin.GlobalAdminAccount.selectSOAP("//admin:queue[@name='" + queueName + "']", null, null, null, 1);

                            if ((queueElement.Attributes["scan"] == null) || (!queueElement.Attributes["scan"].Value.Equals("1")))
                                break; // All done

                            System.Threading.Thread.Sleep(1000);

                        } while (DateTime.Now < finish);

                        StringBuilder idList = null;
                        IEnumerator ienum2 = queueElement.ChildNodes.GetEnumerator();

                        while (ienum2.MoveNext())
                        {

                            System.Xml.XmlNode qi = ienum2.Current as System.Xml.XmlNode;
                            if (qi.Name.Equals("qi"))
                            {
                                count++;

                                if (idList == null)
                                {
                                    idList = new StringBuilder(qi.Attributes["id"].Value);
                                }

                                else
                                {
                                    idList.Append(",").Append(qi.Attributes["id"].Value);
                                }
                            }
                        }

                        if (idList != null)
                        {
                            zAccountAdmin.GlobalAdminAccount.sendSOAP(new MailQueueActionRequest().
                                AddServer(mailHost, queueName, MailQueueActionRequest.Operations.delete, idList.ToString()));
                        }
                    }
                }

            } while (count > 0);
        }

        private class LmtpClient
        {
            private static ILog log = LogManager.GetLogger(System.Reflection.MethodInfo.GetCurrentMethod().DeclaringType);

            private string mGreetname;
            private TcpClient mTcpClient;
            private StreamReader mIn;
            private StreamWriter mOut;
            private char[] lineSeparator = { '\r', '\n' };
            private string mResponse;

            bool mNewConnection = false;

            public LmtpClient(String host, int port)
            {
                mGreetname = System.Environment.MachineName;

                Encoding isoWesternEuropean = Encoding.GetEncoding(28591);
                mTcpClient = new TcpClient(host, port);
                mIn = new StreamReader(mTcpClient.GetStream(), isoWesternEuropean);
                mOut = new StreamWriter(mTcpClient.GetStream(), isoWesternEuropean);

                mNewConnection = true;
            }

            public bool sendMessage(string filename, ArrayList recipients, string sender, string logLabel)
            {
                DateTime start = DateTime.Now;

                if (mNewConnection)
                {
                    mNewConnection = false;

                    // Swallow the greeting
                    if (!replyOk())
                    {
                        throw new HarnessException(mResponse);
                    }

                    sendLine("LHLO " + mGreetname);

                    if (!replyOk())
                    {
                        throw new HarnessException(mResponse);
                    }
                }

                else
                {
                    sendLine("RSET");
                    if (!replyOk())
                    {
                        throw new HarnessException(mResponse);
                    }
                }

                sendLine("MAIL FROM:<" + sender + ">");
                if (!replyOk())
                {
                    throw new HarnessException(mResponse);
                }

                ArrayList acceptedRecipients = new ArrayList();
                foreach (string recipient in recipients)
                {
                    sendLine("RCPT TO:<" + recipient + ">");
                    if (replyOk())
                    {
                        acceptedRecipients.Add(recipient);
                    }
                    else
                    {
                        log.Warn("Recipient `" + recipient + "' rejected");
                    }
                }

                sendLine("DATA");
                if (!replyOk())
                {
                    throw new HarnessException(mResponse);
                }
                // Classic case of lazy programmer here.  We read 8bit data from the file.
                // But we want to treat it as String for a little while because we want to
                // apply transparency and BufferedReader.getLine() is handy.  This conversion
                // here has a reverse with getBytes(charset) elsewhere in sendLine().
                StreamReader br = new StreamReader(new FileStream(filename, FileMode.Open, FileAccess.Read));
                string line;
                while ((line = br.ReadLine()) != null)
                {
                    if (line.Length > 0 && line[0] == '.')
                    {
                        if (line.Length > 1 && line[1] == '.')
                        {
                            // don't have to apply transparency
                        }
                        else
                        {
                            line = "." + line;
                        }
                    }
                    sendLine(line, false);
                }
                sendLine("", false);
                sendLine(".");

                bool allDelivered = true;
                foreach (string recipient in acceptedRecipients)
                {
                    if (replyOk())
                    {
                        TimeSpan elapsed = DateTime.Now - start;
                        log.Debug("Delivery OK msg=" + logLabel + " rcpt=" + recipient + " elapsed=" + elapsed.Seconds + "sec");
                    }
                    else
                    {
                        allDelivered = false;
                        log.Error("Delivery failed msg=" + logLabel + " rcpt=" + recipient + " response=" + mResponse);
                    }
                }
                return allDelivered;
            }

            public void close()
            {
                try
                {
                    sendLine("QUIT");
                    mTcpClient.Close();
                }
                catch
                {
                }
            }

            private void sendLine(string line, bool flush)
            {
                log.Debug("CLI: " + line);
                mOut.Write(line);
                mOut.Write(lineSeparator);
                if (flush) mOut.Flush();
            }

            private void sendLine(string line)
            {
                sendLine(line, true);
            }

            private bool replyOk()
            {
                bool positiveReplyCode = false;
                StringBuilder sb = new StringBuilder();

                while (true)
                {

                    string response = mIn.ReadLine();
                    if (response == null)
                    {
                        break;
                    }

                    log.Debug("SRV: " + response);
                    if (response.Length < 3)
                    {
                        throw new HarnessException("response too short: " + response);
                    }

                    if (response.Length > 3 && response[3] == '-')
                    {
                        sb.Append(response);
                    }
                    else
                    {
                        sb.Append(response);
                        if (response[0] >= '1' && response[0] <= '3')
                        {
                            positiveReplyCode = true;
                        }
                        break;
                    }
                }

                mResponse = sb.ToString();
                return positiveReplyCode;
            }
        }
    }
}
