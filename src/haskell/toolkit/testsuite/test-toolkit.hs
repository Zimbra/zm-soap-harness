#!/bin/env runghc
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 Main test for the system
        
--}

module Main where

import System.Exit
import Zimbra.Server (test)
import Zimbra.Command (test)

main = do
    putStrLn "Zimbra Server Module"
    answer <- Zimbra.Server.test 
    answerTwo <- Zimbra.Command.test
    case foldr1 (&&) [answer, answerTwo] of
      True -> exitSuccess
      False -> exitFailure
