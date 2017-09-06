using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using log4net;
using System.Collections;
using System.Xml;

namespace Utilities
{
    public class MailInject
    {
        private static ILog log = LogManager.GetLogger(typeof(MailInject));


        static public void injectLMTP(string mailHost, TextReader reader, ArrayList toAddresses, string fromAddress)
        {
            LmtpClient client = new LmtpClient(mailHost, 7025);
            ZAssert.IsTrue(client.sendMessage(reader, toAddresses, fromAddress, "stream"), "Verify that LMTP is delivered");

            // Wait for the messages to flush from the queue
            int msDelay = Int32.Parse(HarnessProperties.getString("postfixdelay.msec", "5000"));
            ZAssert.IsTrue(MailInject.waitForPostfixQueue(msDelay / 1000, mailHost), "Check that the message queue is cleared");

        }

        static public void injectLMTP(string mailHost, FileInfo file, ArrayList toAddresses, string fromAddress)
        {
            if (!file.Exists)
            {
                throw new HarnessException("injectLMTP " + file.Name + " does not exist.  CWD: " + (new FileInfo(".")).FullName);
            }

            LmtpClient client = new LmtpClient(mailHost, 7025);
            ZAssert.IsTrue(client.sendMessage(file.FullName, toAddresses, fromAddress, file.Name), "Verify that LMTP is delivered " + file.FullName);

            // Wait for the messages to flush from the queue
            int msDelay = Int32.Parse(HarnessProperties.getString("postfixdelay.msec", "5000"));
            ZAssert.IsTrue(MailInject.waitForPostfixQueue(msDelay / 1000, mailHost), "Check that the message queue is cleared");

        }
        
        static public void injectLMTP(string mailHost, DirectoryInfo folder, ArrayList toAddresses, string fromAddress) 
        {
            if (!folder.Exists)
            {
                throw new HarnessException("injectLMTP " + folder.Name + " does not exist.  CWD: " + (new FileInfo(".")).FullName);
            }

            LmtpClient client = new LmtpClient(mailHost, 7025);
            foreach (FileInfo fileInfo in folder.GetFiles())
            {
                ZAssert.IsTrue(client.sendMessage(fileInfo.FullName, toAddresses, fromAddress, fileInfo.Name), "Verify that LMTP is delivered " + fileInfo.FullName);
            }

            // Wait for the messages to flush from the queue
            int msDelay = Int32.Parse(HarnessProperties.getString("postfixdelay.msec", "5000"));
            ZAssert.IsTrue(MailInject.waitForPostfixQueue(msDelay / 1000, mailHost), "Check that the message queue is cleared");

        }


        static public bool waitForPostfixQueue()
        {
            int msDelay = Int32.Parse(HarnessProperties.getString("postfixdelay.msec", "5000"));
            foreach (string host in ZimbraAccount.getZimbraMailboxHosts())
            {
                if (!waitForPostfixQueue(msDelay, host))
                {
                    return (false);
                }
            }
            return (true);
        }

        static public bool waitForPostfixQueue(int delaySeconds, string mailHost)
        {

            MailInject mailInject = new MailInject();

            // Make sure a valid delay was set
            if (delaySeconds <= 0)
            {
                throw new HarnessException("waitForPostfixQueue - delaySeconds must be greater than 0");
            }

            if (!mailInject.initializeSTAF(mailHost))
            {
                LogManager.GetLogger("TestCaseLogger").Warn("STAF is not running.  Wait 5 seconds for mail to be delivered.");
                System.Threading.Thread.Sleep(5000);
                return (true);
            }

            DateTime finish = DateTime.Now.AddSeconds(delaySeconds);
            log.Debug("waitForPostfixQueue: waiting until " + finish + " for the queue to clear");
            do
            {

                if (mailInject.isPostfixQueueEmptySTAF(mailHost))
                {
                    return (true);
                }

                System.Threading.Thread.Sleep(1000);

            } while (DateTime.Now < finish);

            // Mail queue never cleared.  Flush it
            log.Warn("waitForPostfixQueue: ran out of time");
            mailInject.clearPostfixQueueSTAF(mailHost);

            return (false);

        }



        private MailInject()
        {
        }

        private bool isPostfixQueueEmptySTAF(string mailHost)
        {
            string command = " process start shell command \"su - zimbra -c \\\"postqueue -p\\\"\" wait returnstdout returnstderr";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            LogManager.GetLogger("TestCaseLogger").Info("staf " + mailHost + command);
            LogManager.GetLogger("TestCaseLogger").Info(output);

            return (output.Contains("Mail queue is empty"));
        }

        private void clearPostfixQueueSTAF(string mailHost)
        {
            //string command_postsuper = "/opt/zimbra/postfix/sbin/postsuper";
            string command_postsuper = HarnessProperties.getString("postsuper.path");
            string args_postsuper = "-d ALL";
            string command_staf = " process start shell command \"" + command_postsuper + "\" PARMS " + args_postsuper + " wait returnstdout returnstderr";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command_staf);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            LogManager.GetLogger("TestCaseLogger").Info("staf " + mailHost + command_staf);
            LogManager.GetLogger("TestCaseLogger").Info(output);

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

            LogManager.GetLogger("TestCaseLogger").Warn("staf " + mailHost + command);
            LogManager.GetLogger("TestCaseLogger").Warn(output.Trim());

            if (output.Contains("Error registering with STAF"))
            {
                isRunningSTAF = false;
            }
            else if (output.Contains("Error submitting request"))
            {
                isRunningSTAF = false;
            }
            else
            {
                isRunningSTAF = true;
            }

            return (isRunningSTAF);
        }

        private bool isPostfixQueueEmptySOAP(string mailHost)
        {
            
            // Send the GetMailQueueInfoRequest
            XmlDocument GetMailQueueInfoResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                @"<GetMailQueueInfoRequest xmlns='urn:zimbraAdmin'>
                    <server name='" + mailHost + @"'/>
                </GetMailQueueInfoRequest>");



            //<GetMailQueueInfoResponse xmlns="urn:zimbraAdmin">
            //  <server name="qa60.lab.zimbra.com">
            //    <queue n="1" name="active" />
            //    <queue n="0" name="deferred" />
            //    <queue n="0" name="corrupt" />
            //    <queue n="0" name="incoming" />
            //    <queue n="0" name="hold" />
            //  </server>
            //</GetMailQueueInfoResponse>

            XmlNode serverElement = ZimbraAdminAccount.GlobalAdmin.soapSelect(GetMailQueueInfoResponse, "//admin:server[@name='" + mailHost + @"']");
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


                XmlDocument GetMailQueueInfoResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                    @"<GetMailQueueInfoRequest xmlns='urn:zimbraAdmin'>
                        <server name='" + mailHost + @"'/>
                    </GetMailQueueInfoRequest>");
                XmlNode serverElement = ZimbraAdminAccount.GlobalAdmin.soapSelect(GetMailQueueInfoResponse, "//admin:server[@name='" + mailHost + "']");

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

                            XmlDocument GetMailQueueResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                                @"<GetMailQueueRequest xmlns='urn:zimbraAdmin'>
                                    <server name='" + mailHost + @"'>
					                    <queue name='" + queueName + @"'>
						                    <query offset='0' limit='25'/>
					                    </queue>
				                    </server>
                                </GetMailQueueRequest>");
                            queueElement = ZimbraAdminAccount.GlobalAdmin.soapSelect(GetMailQueueResponse, "//admin:queue[@name='" + queueName + "']");

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

                            ZimbraAdminAccount.GlobalAdmin.soapSend(
                                @"<MailQueueActionRequest xmlns='urn:zimbraAdmin'>
                                    <server name='" + mailHost + @"'>
					                    <queue name='" + queueName + @"'>
                                            <action op='delete' by='id'>"+ idList.ToString() +@"</action
					                    </queue>
				                    </server>
                                </MailQueueActionRequest>");

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
                StreamReader br = null;
                try
                {
                    br = new StreamReader(new FileStream(filename, FileMode.Open, FileAccess.Read));
                    return (sendMessage(br, recipients, sender, logLabel));
                }
                finally
                {
                    if (br != null)
                    {
                        br.Close();
                        br = null;
                    }
                }
            }

            public bool sendMessage(TextReader mimeReader, ArrayList recipients, string sender, string logLabel)
            {

                DateTime start = DateTime.Now;
                if (mNewConnection)
                {
                    mNewConnection = false;

                    // swallow the greeting
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
                string line;
                while ((line = mimeReader.ReadLine()) != null)
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
