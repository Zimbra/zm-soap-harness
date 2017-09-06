//
//  ServerImpl.h
//  TestHarness
//
//  Created by Scott Herscher on 11/14/07.
//  Copyright 2007 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <AddressBook/AddressBook.h>
#import <string>
#import "soapH.h"


@interface ServerImpl : NSObject
{
	NSBundle			*	prefPaneBundle;
	NSString			*	m_appDir;
	NSString			*	m_dbPath;
}


- ( id )
init;


- ( int )
createClientRequest:	( const std::string& )		clientApp
account:				( const std::string& )		account
password:				( const std::string& )		password
incoming:				( Incoming* )				incoming
response:				( CreateClientResponse* )	response;


- ( int )
syncRequest:			( const std::string& )		profileToken
delay:					( ZDelay* )					delay
response:				( SyncResponse* )			response;


- ( int )
createContactRequest:	( const std::string& )		profileToken
cn:						( Contact* )				cn
response:				( CreateContactResponse* )	response;


- ( int )
modifyContactRequest:	( const std::string& )		profileToken
replace:				( int* )					replace
cn:						( Contact* )				cn
response:				( ModifyContactResponse* )	response;


- ( int )
getContactsRequest:		( const std::string& )		profileToken
l:						( char* )					l
cn:						( Contact* )				cn
response:				( GetContactsResponse* )	response;


- ( BOOL )
convertContactToMac:	( Contact* )				cn
abContact:				( ABRecord* )				abContact;


- ( BOOL )
convertContactToZCS:	( ABRecord* )				abContact
cn:						( Contact& )				cn;


@end
