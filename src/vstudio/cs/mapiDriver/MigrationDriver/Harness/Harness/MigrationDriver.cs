using System;
using System.Collections.Generic;
using System.Text;
using log4net;

namespace Harness
{
    public abstract class MigrationDriver 
    {
        protected static ILog logger = LogManager.GetLogger(typeof(MigrationDriver));

        protected MigrationDriver()
        {
            logger.Info("new " + typeof(MigrationDriver));
        }


        /// <summary>
        /// Execute the migration tool
        /// </summary>
        public abstract void migrate();
       

    }
}
