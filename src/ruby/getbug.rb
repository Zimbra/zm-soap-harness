#!/bin/env ruby
#
# $File$ 
# $DateTime$
#
# $Revision$
# $Author$
# 
#
# This script will extract information from bugzilla to tabluate support data
#
require 'rubygems'

require 'getoptlong'
require 'log4r'
require 'net/http'
require 'pg'
require 'uri'
require 'xml'
require 'date'
require 'yaml'
require 'mysql'

include Log4r

module Bugzilla

  MESSAGES =<<DATA
syntms

get bugzilla information

   -h this message
   --verbose more verbose output

   this script takes bugid(s)
DATA

  #Logger setup
  Logger = Logger.new 'reportlog'
  Logger.outputters = StdoutOutputter.new 'console',
  :formatter => PatternFormatter.new(:pattern => "%M")
  Logger.level = INFO
  Logger.level = DEBUG if $DEBUG

  @unit_test = false
  @bugzillaurl = 'http://bug.zimbra.com'
  @norun = false
  DBHOST = "www-prod-db1.zimbra.com"
  DBUSER =  "qauser"
  DBPASSWORD =  "OpJsD_JrbV"

  def Bugzilla.getOptions
    [
     ['-h', GetoptLong::NO_ARGUMENT],
     ['--norun',  GetoptLong::NO_ARGUMENT],
     ['--server', GetoptLong::OPTIONAL_ARGUMENT],
     ['--test', GetoptLong::NO_ARGUMENT],
     ['--verbose', GetoptLong::NO_ARGUMENT]
    ]
  end

  def Bugzilla.printHelp
    Logger.info MESSAGES%[@bugzillaurl, @tms]
  end

  @unit_test = false

  begin
    ::GetoptLong.new(*getOptions).each do | opt, arg|
      case opt
      when '-h' then 
        printHelp
        exit
      when '--norun' then
        @norun = true
      when '--server' then
        @bugzillaurl = arg
      when '--verbose' then
        Logger.level = DEBUG
      when '--test' then
        @unit_test = true
      end  
    end
  rescue  GetoptLong::InvalidOption
    printHelp
    exit
  end

  def Bugzilla.getField(doc, field)
    Logger.debug("getField: Serach for field %s"%field)
    doc.find("//*/%s"%field).map do |node|
      Logger.debug("getField: value %s"%node.content)
      node.content 
    end
  end

  # not used..xml method
  def Bugzilla.getTD(doc)
    doc.find("//*/td").map do |node|
      node.content
    end
  end

    
  # not used..xml method
  def Bugzilla.getCookie
    cookieFile = '~.bugcookie'
    cookie = nil
    if(File.exist?(cookieFile))
      Logger.debug "getCookie: has cookie in file %s"%cookieFile
      File.open(cookieFile, "r") do |mfile|
        cookie = YAML.load(mfile.readline)
      end
    else
      Logger.debug "no cookie file"
      params = {'Bugzilla_login' => 'qa-automation@zimbra.com', 'Bugzilla_password' => 'OpJsD_JrbV',  'GoAheadAndLogIn' => '1'}
      #params = {'Bugzilla_login' => 'qa-automation@zimbra.com', 'Bugzilla_password' => 'OpJsD_JrbV', 'Bugzilla_remember' => 'on', 'GoAheadAndLogIn' => '1'}
      myuri = URI.parse("http://bugzilla.zimbra.com/index.cgi")
      res = Net::HTTP.post_form(myuri, params)
      cookie = res.header['set-cookie']
      File.open(cookieFile, "w") do |mfile|
        mfile.puts(YAML.dump(cookie))
      end
    end
    Logger.debug "cookie is %s"%cookie
    cookie
  end

  #not used..xml method
  def Bugzilla.isDate(input)
    begin
      Date.parse(input)
      true
    rescue 
      false
    end
  end
  
  #not used..xml method
  def Bugzilla.generateHeader(cookie)
     { 'Cookie' => cookie, 
      'Host' => 'bugzilla.zimbra.com', 
      'Content-Type' => 'application/x-www-form-urlencoded',
      'Referer' => 'http://bugzilla.zimbra.com/'}
  end

  #not used..xml method
  def Bugzilla.getDetails(http, cookie, bugid)
    headers = generateHeader(cookie)
    resp, data = http.post('/show_activity.cgi', 'id=%i'%bugid, headers)
    data
  end

  #not used..xml method
  def Bugzilla.getBugColumn(http, cookie, bugid)
    headers = generateHeader(cookie)
    resp, data = http.post('/show_bug.cgi', 'id=%i&ctype=xml'%bugid, headers)
    data
  end

  #not used..xml method
  def Bugzilla.detailTransform(tableData)
    mappingHash = {}
    mapkey = nil
    tableData.each do |x|
      Logger.debug("transform: %s"%x)
      if(isDate(x))
        mapkey = x.to_s.split(/\n/).first
        mappingHash[mapkey] = []
      else
        mdata = x.to_s.split(/\n/).first
        mappingHash[mapkey].push(mdata) unless (mapkey.nil? || mdata.size == 0)
      end
    end
    #contruct reverse hash
    reverseHash = {}
    mappingHash.keys.sort.each do |y|
      mappingHash[y].each do |z|
        reverseHash[z] = y
      end
    end
    reverseHash
  end

  def Bugzilla.getBugRow(dbh, columns, bugID)
    fromClause = ['bugs']
    whereClause = ['bugs.bug_id=%i'%bugID]
    tTable = {
      'component' => {
        :from => 'components', 
        :where => 'bugs.component_id = components.id', 
        :field => 'components.name' 
      },

      'fixed' => {
        :from => 'bugs_activity', 
        :where => "bugs.bug_id = bugs_activity.bug_id and bugs_activity.added = 'FIXED' and bugs_activity.fieldid = 11",
        :field => 'bugs_activity.bug_when'
      },
      
      'verified' => {
        :from => 'bugs_activity', 
        :where => "bugs.bug_id = bugs_activity.bug_id and bugs_activity.added = 'VERIFIED' and bugs_activity.fieldid = 8",
        :field => 'bugs_activity.bug_when'
      },
    }

    fieldClause = columns.map do |field|
      if(tTable.has_key?(field))
        tHash = tTable[field]
        fromClause.push(tHash[:from])
        whereClause.push(tHash[:where])
        tHash[:field]
      else
        "bugs.%s"%field
      end
    end
    statement = "select %s from %s where %s"%([fieldClause, fromClause].map do |x| 
                                                x.compact.flatten.uniq.join(', ') 
                                              end  << whereClause.compact.flatten.uniq.join(' and '))
    Logger.debug("getBugRow: statement %s"%statement)
    st = dbh.prepare(statement)
    st.execute
    Logger.debug("getBugRow: number of rows %i"%st.num_rows)
    result = st.fetch
    Logger.debug("getBugFow: query result %s"%YAML.dump(result))
    st.close
    result || Array.new(columns.size, '')
  end

  def Bugzilla.getBug(dbh, bugID)
    columns = ['bug_id', 'component', 'target_milestone', 'keywords', 'resolution', 'bug_severity', 'short_desc', 'fixed', 'verified']

    #main row
    result = getBugRow(dbh, columns[0..-3], bugID)

    #may or may not have fixed date
    resultF = getBugRow(dbh, columns[-2..-2], bugID)

    #my or my not have verified date
    resultV = getBugRow(dbh, columns[-1..-1], bugID)
    [columns, result + resultF + resultV]
  end

  def Bugzilla.createDBConnection
    #Mysql.real_connect("www-prod-db1.zimbra.com", "qauser", "OpJsD_JrbV", "bugzilla")
    Mysql.real_connect(DBHOST, DBUSER, DBPASSWORD, "bugzilla")
  end

  header = ['bug_id', 'component', 'target_milestone', 'keywords', 'resolution', 'bug_severity', 'short_desc', 'fixed', 'verified']
  if(!@unit_test)  
    begin
      Logger.debug("main: starting, mysql access method %s"%DBHOST)
      dbh = createDBConnection
      results = ARGV.map do |bugID|
        getBug(dbh, bugID)
      end
      if(results && results.size > 0)
        puts results.first.first.map {|x| '"%s"'%x}.join(',')
        results.each do |z|
        puts z[1].map {|w| '"%s"'%w}.join(',') 
        end
      end
      Logger.debug("main: db version %s"%dbh.get_server_info)
    ensure
      dbh.close if dbh
    end
    exit
  end

  Logger.info("Start Unit Testing")
  require 'test/unit'

  class TestCaseTest < Test::Unit::TestCase

  end

end
