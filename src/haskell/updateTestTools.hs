#!/bin/env runghc 
{--
 $File$ 
 $DateTime$

 $Revision$
 $Author$

 Update testware files from perfroce.  The testwares are in form of *.tgz file.
--}

{-# OPTIONS_GHC -fglasgow-exts -Wall -fwarn-tabs -fno-warn-name-shadowing #-}
module Main( main ) where

import Control.Monad
import Control.OldException
import Data.Char ( toLower )
import Data.List as L
import HSH
import System( getArgs )
import System.Console.GetOpt
import System.FilePath.Posix ( joinPath, takeDirectory )
import System.IO
import System.IO.Unsafe ( unsafePerformIO )
import Text.Regex.Posix
import System.Log.Logger

{---- Data Types ----}
data Command = Cmd (String, [String]) -- ^ Single system io call.  Cmd("ls", ["/tmp"]) will do 'ls /tmp", for example
             | Pipe (String, String)  -- ^ Shell pipe call.  For example Pipe ("ls -l /tmp", "tee /tmp/hi.txt")
             | Cmds [Command]         -- ^ List of commands
             | NOP                    -- ^ No operation
               deriving (Eq, Ord, Show)
-- ^ data structure for various system io calls

data Opts = Opts 
    { verbose                -- ^ Turn verbose mode on
    , version    :: Bool     -- ^ Version switch
    , wareFilter :: [String] -- ^ What testware to update.  All testwares will be updated if no filter is supplied
    } deriving Show
-- ^ Command line options data structure

data Testware = W String  -- ^ Testware name
    deriving (Eq, Ord, Show)
-- ^ Testware data to describe type of testware

data Package = TS [String]  -- ^ One or more tgz file
             | LN String
               deriving (Eq, Ord, Show)
-- ^ Testware package, currently only TGZ file via fileio is described

data BranchMap  = BM [(String, String)]  -- ^ Array of branch mapping
                deriving (Eq, Ord, Show)
-- ^ Mapping of p4 branch to testware directory name
-- ^ BM [("main","TestToolsMain")] maps branch "main" to testware directory TestToolsMain

data WareMapping = WM 
    { tw :: Testware    -- ^ Testware
    , p  :: Package     -- ^ Package test ware is mapped to
    , bm :: BranchMap } -- ^ Branchmap for the testware
                   deriving Show
-- ^ Describe testware mapping

{-- Constants --}
appName :: String
-- ^ Name of the application.
appName = "updateTestTools"

topWDir :: String
-- ^ Top level testware directory
topWDir = "/opt/qa"

-- ^ MD5 suffix
md5 :: String
md5 = ".MD5"


-- ^ Current branch maps.  brancMap is used to specify which branch may need to be updated

branchMap :: BranchMap
branchMap = BM [("main", "TestToolsMain")
               , ("HELIX", "TestToolsHelix")
               , ("OCTOPUS", "TestToolsOctopus")
               , ("IRONMAIDEN", "TestToolsIronMaiden")]

seleBranchMap :: BranchMap
seleBranchMap = BM [("main", "SeleniumMain")
               , ("HELIX", "SeleniumHelix")
               , ("OCTOPUS", "SeleniumOctopus")
               , ("IRONMAIDEN", "SeleniumIronMaiden")]

nomapping :: BranchMap
nomapping = BM []

versionString :: String
versionString = "1.0"
-- ^ Does not have branch mapping

tools, genesis, mapi, pst, soap, install, staf, perf, desktop, selng, tsetup, zco  :: WareMapping
-- ^ Testware map for various known test drivers
genesis = WM { tw = W "genesis", p = TS ["genesis.tgz"], bm = nomapping }
-- genesis = WM { tw = W "genesis", p = TS ["genesis.tgz"], bm = nomapping }
mapi    = WM { tw = W "mapivalidator", p = TS ["mapidata.tgz"], bm = nomapping }
pst     = WM { tw = W "pstvalidator", p = TS ["pstdata.tgz"], bm = nomapping }
soap    = WM { tw = W "soapvalidator", p = TS ["soapdata.tgz"], bm = nomapping }
install = WM { tw = W "zimbraInstall", p = TS ["upgrade.tgz"], bm = nomapping }
staf    = WM { tw = W  "staf", p = TS ["stafstax.tgz"], bm = BM [("FRANK_TOI", "TestToolsMain")] }
perf    = WM { tw = W "zimbraperf", p = TS ["perfdata.tgz", "perfcore.tgz"]
             ,bm = BM [("main", "ZimbraPerfMain"), ("IRONMAIDEN", "ZimbraPerfMain"), 
                       ("FRANKLIN", "ZimbraPerfMain"), ("HELIX", "ZimbraPerfMain"), 
                                                     ("GNR", "ZimbraPerfMain"), ("GNR-607", "ZimbraPerfMain")]}
desktop = WM { tw = W "ZDesktop", p = LN "SelNG", bm = seleBranchMap }
selng   = WM { tw = W "SelNG", p = TS ["selng.tgz"], bm = seleBranchMap }
tsetup  = WM { tw = W "setup", p = TS ["tenvsetup.tgz"], bm = nomapping}
tools   = WM { tw = W "tools", p = TS ["tools.tgz"], bm = nomapping }
zco     = WM { tw = W "synclient", p = TS ["zco.tgz"], bm = nomapping }
          

-- | List of test drivers that may need testware update
workList :: [WareMapping]
workList = [genesis, mapi, pst, tools, soap, install, staf, selng, desktop, tsetup, perf, zco]  -- ^ exclude qtp

-- | Produce a new testware map based on the option parameter -f
workFilter               :: Opts -> [WareMapping] -> [WareMapping]
workFilter opts
 | compareMap == [] = id
 | otherwise             = 
     Prelude.filter $ \x -> 
         mCompare compareMap (tw x)
 where
   compareMap       = wareFilter opts
   lc               = Prelude.map toLower
   mCompare y (W x) = any (\z -> lc x =~ lc z) y  -- check to see if search term is substring of Testware

-- | Given FilePath, produces the testware top level directory
warePath          :: (FilePath, t) -> Testware -> FilePath
warePath bm ware = joinPath [topWDir, fst bm, wareName]
 where
   (W wareName) = ware

tarPath :: (String, b) -> Testware -> FilePath
tarPath bm ware
 | wareName == "staf" = wareDirectory
 | otherwise          = takeDirectory wareDirectory
 where
   (W wareName) = ware
   wareDirectory = warePath bm ware

-- | Remove directory insturction
genRemove       :: (String, t) -> WareMapping -> Command
genRemove bm wm =
    Cmd ("rm", ["-rf", warePath bm ware])
 where ware= tw wm

-- | Make ware directory instruction
genMkdir            :: (FilePath, t) -> WareMapping -> Command
genMkdir  branch wm = Cmd ("mkdir", ["-p", warePath branch ware])
    where ware = tw wm

-- genLS branch wm = Cmds [ Cmd ("ls", ["/tmp"]), Cmd ("ls", ["/var/tmp"])]

-- | Get testware's antdirectory based on waremapping
getAntDirectory :: (String, String) -> WareMapping -> String
getAntDirectory mapping wm
    | branchList == [] = target -- No extra mapping, just use default
    | otherwise                 -- Do mapping selection  
    = let thisBranch = Prelude.filter (\(x, _) -> x == branch) branchList
      in case thisBranch of
           [] -> target
           _  -> snd $ head thisBranch
    where
      BM branchList = bm wm
      (branch, target) = mapping

-- | Generate untar instruction
genUntar            :: (String, String) -> WareMapping -> Command
genUntar mapping wm =
    case p wm of 
      TS []       -> NOP
      TS tarballs -> Cmds $ (Prelude.map (\x -> Cmd ("nice", tarPrefix 
                                                               ++ [joinPath [tarballPath, x]])) tarballs)
                     ++ (Prelude.map (\x-> Cmd ("cp", ["-f", joinPath [tarballPath, x++md5], wareDir])) tarballs)  -- save checksum file
      LN directory -> Cmd ("ln", ["-s", joinPath [branchPath, directory], joinPath [branchPath, wareName]])
    where
      (W wareName) = tw wm
      branchPath = (tarPath mapping (tw wm))
      wareDir = (warePath mapping (tw wm))
      antDirectory = getAntDirectory mapping wm
      tarPrefix = ["tar", "-C",  branchPath, "-xzf"]
      tarballPath  = joinPath [topWDir, "testware/",  antDirectory]
      
                  
-- | Generate commands for a given testware 
workForWare            :: (String, String) -> WareMapping -> [Command]
workForWare mapping wm = 
    case p wm of
      TS _ -> Prelude.map (\x -> x mapping wm) [genRemove, genMkdir, genUntar]
      LN _ -> Prelude.map (\x -> x mapping wm) [genRemove, genUntar]

eqSumLog :: String
eqSumLog = appName ++".eqSum"
-- ^ log name for method eqSum

-- | check to see if cksum of checkFile is equal to value inside sumFile
eqSum                   :: String -> String -> IO Bool
eqSum checkFile sumFile = 
    handle (\_ -> return False) 
               (do
                 debugM eqSumLog $ "checkfile " ++ checkFile
                 debugM eqSumLog $ "sumFile " ++ sumFile
                 onh <- openFile checkFile ReadMode
                 result <- liftM (head . words) (hGetLine onh)
                 hClose onh
                 -- result <- liftM (head . words . head) (run $ "cat "++checkFile++md5)
                 inh <- openFile sumFile ReadMode
                 inpStr <- liftM (head . words) (hGetLine inh)
                 hClose inh         
                 debugM eqSumLog $ "sum:" ++ inpStr ++ " check:" ++ result ++ " " ++ show (result == inpStr)
                 return (result == inpStr))

-- | Generate work for a set of branchmap
genWorks :: BranchMap -> [WareMapping] -> [[Command]]
genWorks (BM w) v = do
  x <- w
  y <- v
  let antDirectory = getAntDirectory x y
  let p4file = case p y of
                  TS antTs -> head antTs
                  LN _ -> []
  let tarball = joinPath [topWDir, "testware/", antDirectory, p4file] -- get the tgz file
  let branchPath = (warePath x (tw y))
  let result =  unsafePerformIO $ eqSum (tarball++md5) (joinPath [branchPath,  p4file++md5])  -- check to see if update is necessary
  guard $ not result
  return $ workForWare x y

-- | Option matrix                                           
options :: [OptDescr (Opts -> Opts)]
options =
 [ Option ['v'] ["verbose"] (NoArg (\o -> o {verbose = True})) "verbose" -- turn verbose on or off
   ,Option ['V'] ["version"] (NoArg (\o -> o {version = True})) "show version number"
   ,Option ['f'] ["filter"] (ReqArg (\s -> \o -> o {wareFilter = (flip L.union) [s] $ wareFilter o}) "FILTER") "testware filter"
 ]

-- | Option parser
parseOpts      :: [String] -> IO ([Opts -> Opts], [String])
parseOpts argv =
    case getOpt Permute options argv of
      (o, n, [])   -> return (o, n)
      (_, _, errs) -> ioError (userError (concat errs ++ usageInfo header options))
    where header = "Usage: " ++ appName ++ " [OPTION...]"

-- | Option processor
processOpts      :: [Opts -> Opts] -> Opts
processOpts []   = allOpts False
processOpts opts = foldl (flip ($)) (allOpts False) opts

-- | Initial option condition
allOpts :: Bool -> Opts
allOpts b =  Opts { verbose = b, version = b, wareFilter = []}

-- | Log names for runCommand funtion
runCommandLog :: String
runCommandLog = appName ++ ".runCommand"

-- | Execute command datastructure
runCommand          :: Command -> IO [String]
runCommand commands = do
    case commands of
      Cmds [] -> return ["."]   
      NOP -> return ["NO OP"]
      Cmd x@(cmd, arg) -> handle (\w -> return ["error " ++ show w])  -- flush to prevent deadlock with debugM
                          (do
                            debugM runCommandLog $ (cmd ++ ", '" ++ L.intercalate ", " arg ++ "'")
                            result <- run $ x
                            return $ [cmd] ++ result)       
      Cmds (y1:y2) -> L.foldl' (\o q -> liftM2 (++) o (runCommand q)) (runCommand y1) y2
      Pipe (a, b) -> handle (\w -> return ["error " ++ show w]) 
                     (do
                       result <- run $ a -|- b
                       return $ [a ++ "|" ++ b] ++ result)
           
main :: IO [String]
main = do
  args <- getArgs
  (optList, _) <- parseOpts args
  let opts = processOpts optList
  case version opts of
    True  -> return [versionString]
    False -> do
         let matrix = genWorks branchMap $ workFilter opts workList -- generate work
         case verbose opts of
           True -> updateGlobalLogger appName (setLevel DEBUG)
           _ -> return ()
         result <- runCommand . Cmds . concat $ matrix -- run those commands
         case verbose opts of
           True  -> return $ ["Result: "] ++ result
           False -> return [""]

