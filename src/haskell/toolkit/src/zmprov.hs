#!/bin/env runghc
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 zmprov wrapper
        
--}
module Main( main ) where

import System.Cmd
import System.Environment ( getArgs )
import Zimbra.Command

main = do
   args <- getArgs
   let myCommand = getCommand "zmprov" args
   printCmd myCommand
   result <- system $ snd myCommand
   return result