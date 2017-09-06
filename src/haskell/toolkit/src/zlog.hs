#!/bin/env runghc
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 Get log from remote system
        
--}
module Main( main ) where

import System.Environment ( getArgs )
import System.Cmd
import Zimbra.Server

main = do
   args <- getArgs
   let thisServer = server args
   let scpCommand = "vim scp://root@" ++ thisServer ++ "//opt/zimbra/log/" ++ zlog args
   putStrLn $ "Server:  " ++ thisServer
   putStrLn $ "Command: " ++ scpCommand
   result <- system scpCommand
   return result