using System;
using System.Collections.Generic;
using System.Text;

namespace Harness
{
    public class Button
    {
        public static Button Default = new Button("Default", "Default"); // Execute the default behavior, i.e. "Next" or "Finish"

        public static Button Back = new Button("Back", "< &Back");
        public static Button Next = new Button("Next", "&Next >");
        public static Button Cancel = new Button("Cancel", "&Cancel");
        public static Button CancelNoShortcut = new Button("CancelNoShortcut", "Cancel");
        public static Button Help = new Button("Help", "Help");
        public static Button Finish = new Button("Finish", "Finish");
        public static Button Run = new Button("Run", "&Run");
        public static Button Ok = new Button("OK", "&OK");
        public static Button OkNoShortcut = new Button("OkNoShortcut", "OK");
        public static Button Yes = new Button("Yes", "&Yes");

        private String ID;
        private String Caption;

        private Button(String id, String caption)
        {
            ID = id;
            Caption = caption;
        }

        public String caption
        {
            get { return Caption; }
        }


    }
}
