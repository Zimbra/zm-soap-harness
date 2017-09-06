using System;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using log4net;
using System.Collections;

namespace Harness
{
    public class MailInject
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        protected static ILog tcLog = LogManager.GetLogger(TestCaseLog.tcLogName);

        static public void injectLMTP(string mailHost, string fileOrFolder, ArrayList toAddresses, string fromAddress)
        {

            LmtpClient client = new LmtpClient(mailHost, 7025);

            if (Directory.Exists(fileOrFolder))
            {

                DirectoryInfo directoryInfo = new DirectoryInfo(fileOrFolder);
                foreach (FileInfo fileInfo in directoryInfo.GetFiles())
                {
                    ZAssert.IsTrue(client.sendMessage(fileInfo.FullName, toAddresses, fromAddress, fileInfo.Name), "Verify that LMTP is delivered " + fileInfo.FullName);
                }

            }
            else if (File.Exists(fileOrFolder))
            {

                FileInfo fileInfo = new FileInfo(fileOrFolder);
                ZAssert.IsTrue(client.sendMessage(fileInfo.FullName, toAddresses, fromAddress, fileInfo.Name), "Verify that LMTP is delivered " + fileInfo.FullName);

            }
            else
            {

                throw new HarnessException("injectLMTP " + fileOrFolder + " does not exist");

            }

            // Wait for the messages to flush from the queue
            int delay = Int32.Parse(GlobalProperties.getProperty("postfixdelay.msec"));
            ZAssert.IsTrue(MailInject.waitForPostfixQueue(delay / 1000, mailHost), "Check that the message queue is cleared");

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
                tcLog.Warn("STAF is not running.  Wait 5 seconds for mail to be delivered.");
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

            tcLog.Info("staf " + mailHost + command);
            tcLog.Info(output);

            return (output.Contains("Mail queue is empty"));
        }

        private void clearPostfixQueueSTAF(string mailHost)
        {
            //string command_postsuper = "/opt/zimbra/postfix/sbin/postsuper";
            string command_postsuper = "/opt/zimbra/common/sbin/postsuper";
            string args_postsuper = "-d ALL";
            string command_staf = " process start shell command \"" + command_postsuper + "\" PARMS " + args_postsuper + " wait returnstdout returnstderr";

            ProcessStartInfo processStartInfo = new ProcessStartInfo("staf", mailHost + command_staf);
            processStartInfo.UseShellExecute = false;
            processStartInfo.RedirectStandardOutput = true;

            Process process = new Process();
            process.StartInfo = processStartInfo;
            process.Start();

            string output = process.StandardOutput.ReadToEnd();

            tcLog.Info("staf " + mailHost + command_staf);
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

            tcLog.Warn("staf " + mailHost + command);
            tcLog.Warn(output.Trim());

            return (isRunningSTAF = !output.Contains("Error registering with STAF"));
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
