using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Office.Interop.Outlook;
using Redemption;
using log4net;
using System.Xml;
using System.IO;
using System.Runtime.InteropServices;

namespace SyncHarness
{
    public class UtilFunctions
    {
        private static int MAX = 100;
        private static int MAXCHAR = 9;
        private static Random random = new Random();

        // Find out exact file path of Program Files. In x64 bit machine it is C:\Program Files (x86).
        // In x32 bit machine it is C:\Program Files.
        public static string ProgramFilesLocation = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);

        public UtilFunctions()
        {
           
        }
        public static string RandomStringGenerator()
        {
            return RandomStringGenerator(MAXCHAR);
        }
        
        public static string RandomStringGenerator(int size)
        {
          
            StringBuilder builder = new StringBuilder();
            char ch;
            for (int j = 0; j < size; j++)
            {
                ch = Convert.ToChar(Convert.ToInt32(Math.Floor(26 * random.NextDouble() + 65)));
                builder.Append(ch);
            }

            return (builder.ToString().ToLower());
        
        }

        public static string RandomUpperLowerStringGenerator()
        {
            return (RandomUpperLowerStringGenerator(MAXCHAR));
        }

        public static string RandomUpperLowerStringGenerator(int size)
        {

            StringBuilder builder = new StringBuilder();
            char ch;
            for (int j = 0; j < size; j++)
            {
                ch = Convert.ToChar(Convert.ToInt32(Math.Floor(26 * random.NextDouble() + 65)));

                if (j % 2 == 0)
                {
                    builder.Append(ch.ToString().ToUpper());
                }
                else
                {
                   builder.Append(ch.ToString().ToLower());
                }
            }

            return (builder.ToString());

        }

        public static string RandomNumberStringGenerator()
        {
            return RandomNumberStringGenerator(8, 0, 9);
        }

        public static int RandomNumberGenerator()
        {
            return RandomNumberGenerator(0);
        }

        public static string RandomNumberStringGenerator(int size,int min, int max)
        {
            StringBuilder builder = new StringBuilder();

            for (int j = 0; j < size; j++)
            {
                builder.Append(random.Next(min,max));
            }

            return ((string)builder.ToString());
        }

        public static int RandomNumberGenerator(int min,int max)
        {
            return random.Next(min, max);
        }


        public static int RandomNumberGenerator(int min)
        {
            return RandomNumberGenerator(min,MAX);
        }

       
      

       
    }
}
