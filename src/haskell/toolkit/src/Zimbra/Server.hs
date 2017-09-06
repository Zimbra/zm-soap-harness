#!/bin/env runghc
{--
 $File: //depot/zimbra/main/ZimbraQA/src/haskell/updateTestTools.hs $ 
 $DateTime: 2011/10/12 17:45:54 $

 $Revision: #19 $
 $Author: bhwang $

 Zimbra Server Module
        
--}

{-# LANGUAGE TemplateHaskell #-}
module Zimbra.Server where
import Network.BSD
import Test.QuickCheck ( quickCheck )
import Test.QuickCheck.All ( quickCheckAll )

-- |The default server hostname
serverDefault = "zqa-062.eng.vmware.com"

-- |The 'server' function returns first element of the list or serverDefault
server         :: [HostName] -> HostName
server []      = serverDefault
server ("":xs) = serverDefault
server (x:xs)  = x

prop_server_null :: [HostName] -> Bool
prop_server_null = \s -> server [] == serverDefault

prop_server_first :: [HostName] -> Bool
prop_server_first = (\s -> let result = server s in
                      result ==  serverDefault || result == s!!0)

-- |The default log
zlogDefault = "mailbox.log"

-- |The 'log function return 2nd element of the list or logDefault
zlog :: [[Char]] -> [Char]
zlog []       = zlogDefault
zlog (x:[])   = zlogDefault
zlog (_:x:xs) = x

prop_log_null = \s -> zlog [] == zlogDefault
prop_log_second = (\s -> let result = zlog s in
                          result == zlogDefault || result == s!!1) :: [[Char]] -> Bool

  
test = $quickCheckAll