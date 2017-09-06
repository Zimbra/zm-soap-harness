using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Threading;

namespace Harness
{
    public class AbstractWindow
    {

        protected static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        protected String Title;
        protected String Content;
        protected Button DefaultButton;

        protected bool isProcessed = false;
        protected IntPtr CurrentHandle = IntPtr.Zero;
        protected IntPtr ParentHandle = IntPtr.Zero;

        /**
         * Define a new window
         * 
         * @param title The window title bar text (for matching)
         * @param conent Text that appears in the body of the window (for matching)
         * @param defaultButton The Button to press for default behavior (i.e. Button.Next)
         */
        protected AbstractWindow(String title, String content, Button defaultButton)
        {
            log.Info("New " + this.GetType());

            Title = title;
            Content = content;
            DefaultButton = defaultButton;
        }

        /**
         * Take the default behavior, such as fill out fields and press Next
         */
        public void process()
        {
            log.Info(this.GetType() + ".process()");

            this.button(this.DefaultButton);

            this.isProcessed = true;
        }

        /**
         * Does the window exist in the OS window list?
         * 
         * @returns true if exists, false otherwise
         */
        public bool exists()
        {
            this.CurrentHandle = GetCurrentHandle();
            log.Info(this.GetType() + ".exists() = " + (this.CurrentHandle != IntPtr.Zero));

            return (this.CurrentHandle != IntPtr.Zero);
        }


        /**
         * Is the window in the foreground
         * 
         * @returns true if in the foreground, false otherwise
         */
        public bool isForeground()
        {
            this.CurrentHandle = GetCurrentHandle();
            IntPtr foreground = User32.ZGetForegroundWindow();

            log.Info(this.GetType() + ".isForeground() = " + (this.CurrentHandle == foreground));

            return (this.CurrentHandle == foreground);
        }

        public bool HasBeenProcessed
        {
            get  { return isProcessed; }
        }

        /**
         * Press the specified button
         * 
         */
        public void button(Button b)
        {
            log.Info(this.GetType() + ".button("+ b.caption +")");

            IntPtr windowHandle = IntPtr.Zero;
            IntPtr buttonHandle = IntPtr.Zero;

            if ((b == Button.Default) || (b == this.DefaultButton))
            {

                // Click the 'Run' button
                windowHandle = WindowUtils.FindWindowHandle(this.Title, this.Content);
                buttonHandle = WindowUtils.FindChildHandle(windowHandle, this.DefaultButton.caption, "Button");

            }
            else
            {
                throw new HarnessException("No implementation for Button: " + b.caption);
            }

            if (buttonHandle == IntPtr.Zero)
                throw new HarnessException("Button not found: " + b.caption);

            // Default behavior, click on the button
            User32.ZSendMessage(buttonHandle, (uint)WindowUtils.DialogBoxMessages.BM_CLICK, 0, 0);
            Thread.Sleep(1000);


        }

        /**
         * Get the topmost handle
         **/
        protected IntPtr GetParentHandle(IntPtr handle)
        {
            if (handle == IntPtr.Zero)
                return (IntPtr.Zero);

            IntPtr parent = handle;

            while (User32.ZGetParent(parent) != IntPtr.Zero)
            {
                parent = User32.ZGetParent(parent);
            }
            log.Info("GetParentHandle("+ handle +") = " + parent);
            return (parent);
        }

        protected IntPtr GetCurrentHandle()
        {
            IntPtr handle = WindowUtils.FindWindowHandle(this.Title, this.Content);
            if (this.CurrentHandle != handle)
            {
                // first time we have found this handle

                // Trace it
                WindowUtils.TraceHandle(handle);

                // Find the parent
                this.ParentHandle = GetParentHandle(handle);

                // Clear the "processed?" flag
                this.isProcessed = false;

            }

            return (handle);

        }
    }
}
