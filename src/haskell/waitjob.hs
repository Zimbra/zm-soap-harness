{--
 $File: //depot/zimbra/main/ZimbraQA/src/haskell/updateTestTools.hs $ 
 $DateTime: 2011/10/12 17:45:54 $

 $Revision: #19 $
 $Author: bhwang $

 Wait for for queues to finish
 Usage: waitjob host1 host2 ...
--}

{-# OPTIONS_GHC -XFlexibleContexts -Wall #-}
module Main( main ) where
import Control.Concurrent ( threadDelay )
import Data.Convertible.Base
import Database.HDBC
import Database.HDBC.PostgreSQL
import System.Environment
import System.Time

busy :: [String] -> [Bool] -> IO ()
busy hosts busystate =
  do
    time <- getClockTime
    putStrLn $ show time ++ show hosts ++ show busystate
    threadDelay 60000000 -- wait one minute
    main

free :: [String] -> [Bool] -> IO ()
free hosts busystate =
  do
    time <- getClockTime
    putStrLn $ show time ++ show hosts ++ show busystate
    --  args <- getArgs
    --  endJob  (args!!1) (args!!2)
    
-- endJob :: [Char] -> [Char] -> IO [Char]
-- endJob host jobID = 
--   do
--     (_ , rsp) <- Network.Browser.browse $ do
--       setAllowRedirects True
--       request . getRequest $ "http://" ++ host ++ "/jobs/endJob/" ++ jobID
--     fmap (take 100) (getResponseBody $ Right rsp)

checkHost :: (Data.Convertible.Base.Convertible a SqlValue,
              IConnection conn) =>
             conn -> a -> IO Bool
checkHost conn host =
    do
      qResult <- quickQuery'  conn "select busy from machines where name = ?  limit 1" [toSql host]  
      let result = head . head $ qResult
      case result of
        Database.HDBC.SqlNull ->  return False -- null database result so.. assumg it doesn't exist
        _ -> return $ fromSql result

    
main :: IO ()
main =
  do -- Connect to the database
    args <- getArgs
    conn <- connectPostgreSQL $ "host='zqa-tms.eng.vmware.com' dbname='tms_production' " ++
            "user='postgres' password='zimbra'"
    r <- mapM (checkHost conn) args
    disconnect conn
    case foldr1 (||) r of True -> busy args r
                          False -> free args r
              
  
  
                               
