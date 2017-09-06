#!/bin/env runghc
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 Get version number from remote system
        
--}
module Main( main ) where

import HSH
import System.Environment ( getArgs )
import Zimbra.Server

command = ["su", "-", "zimbra", "-c", "'zmcontrol -v'"]

main :: IO ()
main = do
   args <- getArgs
   let thisServer = server args
   putStrLn $ "Server:  " ++ thisServer
   results <- run $ ("ssh", 
                     ["root@" ++ thisServer] ++ command ) :: IO [String]
   putStrLn $ "Version: " ++ head results