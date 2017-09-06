using System;
using System.Collections.Generic;
using System.Text;
using System.Drawing.Imaging;
using log4net;
using System.Drawing;
using System.Windows.Forms;
using System.IO;

namespace SyncHarness
{
    public class Screenshot
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public static String TakeScreenshot()
        {
            return (TakeScreenshot(TestCaseLog.Instance.GetLogDirectory().FullName));
        }

        public static String TakeScreenshot(String foldername)
        {
            String filename = "screenshot" + GlobalProperties.time() + GlobalProperties.counter();
            return (TakeScreenshot(foldername, filename));
        }

        public static String TakeScreenshot(String foldername, String filename)
        {
            FileInfo fileinfo = new FileInfo(foldername + @"\" + filename + ".jpeg");

            String file = fileinfo.FullName;
            Instance.screenBitmap = new Bitmap(Screen.PrimaryScreen.Bounds.Width, Screen.PrimaryScreen.Bounds.Height, PixelFormat.Format32bppArgb);
            Instance.screenGraphics = Graphics.FromImage(Instance.screenBitmap);
            Instance.screenGraphics.CopyFromScreen(Screen.PrimaryScreen.Bounds.X, Screen.PrimaryScreen.Bounds.Y, 0, 0, Screen.PrimaryScreen.Bounds.Size, CopyPixelOperation.SourceCopy);
            Instance.screenBitmap.Save(file, ImageFormat.Jpeg);

            // Log the screenshot
            LogManager.GetLogger(TestCaseLog.tcLogName).Info("Screenshot: Saved bitmap to " + file);

            return (file);
        }

        #region Singleton


        private Bitmap screenBitmap;
        private Graphics screenGraphics;

        private static Screenshot instance;

        private static readonly Object mutex = new Object();

        private Screenshot() 
        {
            log.Debug("Screenshot: ...");
            log.Debug("Screenshot: ... done");
        }

        private static Screenshot Instance
        {
            get
            {
               lock(mutex)
                   return (instance == null ? (instance = new Screenshot()) : instance);
            }
        }

        #endregion

    }
}
