using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Text.RegularExpressions;

namespace CleanUpArchive
{
    class Program
    {

        Program()
        {
        }

        // main entry point
        void execute(DirectoryInfo directory)
        {
            Console.WriteLine("Processing " + directory.FullName);

            if (directory.Name.Equals("latest"))
            {
                Console.WriteLine("Skipping");
                return;
            }

            // Match against (for example): "20110503053000"
            // If this isn't a build folder, try the subfolders
            if (!Regex.IsMatch(directory.Name, "[0-9]{14}", RegexOptions.None))
            {
                Console.WriteLine("Not a build folder");


                // Not a build folder, try the subfolders
                foreach (DirectoryInfo d in directory.GetDirectories())
                {
                    execute(d);
                }

                return;
            }

            // This is a build folder.  Check if it is older than 10 days.
            if (directory.CreationTime < DateTime.Now.AddDays(-10))
            {
                Console.WriteLine("Delete based on CreationTime: "+ directory.CreationTime);

                // Old folder.  Delete it.
                directory.Delete(true);

                return;
            }

            Console.WriteLine("Skipped");

        }

        static void Main(string[] args)
        {

            Program p = new Program();
            p.execute(new DirectoryInfo("/P4/archive/"));
        }
    }
}
