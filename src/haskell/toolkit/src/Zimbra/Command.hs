#!/bin/env runghc
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 Zimbra Command Module
        
--}

{-# LANGUAGE TemplateHaskell #-}
module Zimbra.Command where
import Data.List (intercalate)
import Network.BSD
import Zimbra.Server
import Test.QuickCheck ( quickCheck )
import Test.QuickCheck.All ( quickCheckAll )

ssh = "ssh"
user = "root"
quote = "\\'"
su = ["su", "-", "zimbra", "-c"]

-- | generate command via ssh
getCommand
  :: [Char]
     -> [Network.BSD.HostName] -> (Network.BSD.HostName, [Char])
getCommand [] y = (server y, [])
getCommand x y  = (thisServer, command)
    where thisServer  = server y
          thisProgram = quote: x : drop 1 y ++ [quote]
          trueCommand = su ++ [intercalate " " thisProgram]
          command = intercalate " " $ "ssh":("root@" ++ thisServer):trueCommand

prop_getCommand_null   = \s -> snd (getCommand [] s) == []
prop_getCommand_server = \s -> fst (getCommand s []) == serverDefault

printCmd   :: ([Char], [Char]) -> IO ()
printCmd x = do
    putStrLn $ "Server : " ++ fst x
    putStrLn $ "Command: " ++ snd x
  
test       = $quickCheckAll