//
//  ServerImpl.mm
//  TestHarness
//
//  Created by Scott Herscher on 11/14/07.
//  Copyright 2007 __MyCompanyName__. All rights reserved.
//

#import "ServerImpl.h"
#import <SyncServices/SyncServices.h>
#import <Security/Security.h>
#import <stdlib.h>
#import <unistd.h>
#import <algorithm>
#import <iostream>
#import <cstddef>



// We probably shouldn't be calling this, but it makes setting up method callbacks SOOOO much
// easier

extern "C"
{
	id objc_msgSend(id, SEL, ...);
}


static NSString				*	kABPhoneCompanyLabel		= @"company";
static NSString				*	kABIMsProperty				= @"kABIMsProperty";


// Key: Zimbra Attribute Name
// Val: AttributeMapping
static NSMutableDictionary	*	g_zimbraAttributeMappings	= nil;

// Val: AttributeMapping
static NSMutableArray		*	g_contactAttributeMappings	= nil;


struct AttributeMapping
{
	NSString	*	zcsAttr;
	NSString	*	macPropertyName;
	NSString	* 	macLabelName;
	NSString	* 	macKeyName;
	SEL				toMacSelector;
	SEL				toZCSSelector;
};


#define EncodeToMacSelector(ARG)		@selector(ARG:attribute:propertyName:labelName:keyName:mmv:index:) 
#define EncodeToZCSSelector(ARG)		@selector(ARG:value:)



static AttributeMapping
AttributeMappings[] =
{
	{	@"firstName",			kABFirstNameProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"middleName",			kABMiddleNameProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"lastName",			kABLastNameProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"maidenName",			kABMaidenNameProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"namePrefix",			kABTitleProperty,			NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"nameSuffix",			kABSuffixProperty,			NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"company",				kABOrganizationProperty,	NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"department",			kABDepartmentProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"jobTitle",			kABJobTitleProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"nickname",			kABNicknameProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"birthday",			kABBirthdayProperty,		NULL,							NULL,					EncodeToMacSelector( encodeToMacDate ),				EncodeToZCSSelector( encodeToZCSDate )		},
	{	@"notes",				kABNoteProperty,			NULL,							NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"fileAs",				kABPersonFlags,				NULL,							NULL,					EncodeToMacSelector( encodeToMacDisplayAs ),		EncodeToZCSSelector( encodeToZCSDisplayAs )	},
	{	@"image",				NULL,						NULL,							NULL,					EncodeToMacSelector( encodeToMacImage ),			EncodeToZCSSelector( encodeToZCSImage )		},
	{	@"homeStreet",			kABAddressProperty,			kABAddressHomeLabel,			kABAddressStreetKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeCity",			kABAddressProperty,			kABAddressHomeLabel,			kABAddressCityKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeState",			kABAddressProperty,			kABAddressHomeLabel,			kABAddressStateKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homePostalCode",		kABAddressProperty,			kABAddressHomeLabel,			kABAddressZIPKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeCountry",			kABAddressProperty,			kABAddressHomeLabel,			kABAddressCountryKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workStreet",			kABAddressProperty,			kABAddressWorkLabel,			kABAddressStreetKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workCity",			kABAddressProperty,			kABAddressWorkLabel,			kABAddressCityKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workState",			kABAddressProperty,			kABAddressWorkLabel,			kABAddressStateKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workPostalCode",		kABAddressProperty,			kABAddressWorkLabel,			kABAddressZIPKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workCountry",			kABAddressProperty,			kABAddressWorkLabel,			kABAddressCountryKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherStreet",			kABAddressProperty,			kABOtherLabel,					kABAddressStreetKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherCity",			kABAddressProperty,			kABOtherLabel,					kABAddressCityKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherState",			kABAddressProperty,			kABOtherLabel,					kABAddressStateKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherPostalCode",		kABAddressProperty,			kABOtherLabel,					kABAddressZIPKey,		EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherCountry",		kABAddressProperty,			kABOtherLabel,					kABAddressCountryKey,	EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherAddressLabel",	kABAddressProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},	
	{	@"homePhone",			kABPhoneProperty,			kABPhoneHomeLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workPhone",			kABPhoneProperty,			kABPhoneWorkLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherPhone",			kABPhoneProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherPhoneLabel",		kABPhoneProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"mobilePhone",			kABPhoneProperty,			kABPhoneMobileLabel,			NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"companyPhone",		kABPhoneProperty,			kABPhoneMainLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeFax",				kABPhoneProperty,			kABPhoneHomeFAXLabel,			NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workFax",				kABPhoneProperty,			kABPhoneWorkFAXLabel,			NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"pager",				kABPhoneProperty,			kABPhonePagerLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeEmail",			kABEmailProperty,			kABEmailHomeLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"workEmail",			kABEmailProperty,			kABEmailWorkLabel,				NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherEmail",			kABEmailProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"otherEmailLabel",		kABEmailProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},	
	{	@"homepageURL",			kABURLsProperty,			kABHomePageLabel,				NULL,					EncodeToMacSelector( encodeToMacURL ),				EncodeToZCSSelector( encodeToZCSURL )		},
	{	@"homeURL",				kABURLsProperty,			kABHomeLabel,					NULL,					EncodeToMacSelector( encodeToMacURL ),				EncodeToZCSSelector( encodeToZCSURL )		},
	{	@"workURL",				kABURLsProperty,			kABWorkLabel,					NULL,					EncodeToMacSelector( encodeToMacURL ),				EncodeToZCSSelector( encodeToZCSURL )		},
	{	@"otherURL",			kABURLsProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacURL ),				EncodeToZCSSelector( encodeToZCSURL )		},
	{	@"otherURLLabel",		kABURLsProperty,			kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	@"homeIM",				kABIMsProperty,				kABHomeLabel,					NULL,					EncodeToMacSelector( encodeToMacIM ),				EncodeToZCSSelector( encodeToZCSIM	)		},
	{	@"workIM",				kABIMsProperty,				kABWorkLabel,					NULL,					EncodeToMacSelector( encodeToMacIM ),				EncodeToZCSSelector( encodeToZCSIM	)		},
	{	@"otherIM",				kABIMsProperty,				kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIM ),				EncodeToZCSSelector( encodeToZCSIM	)		},
	{	@"otherIMLabel",		kABIMsProperty,				kABOtherLabel,					NULL,					EncodeToMacSelector( encodeToMacIdentity ),			EncodeToZCSSelector( encodeToZCSIdentity )	},
	{	NULL,					NULL,						NULL,							NULL,					NULL,												NULL										}
};

using namespace std;

template <typename T>
T*
resize
	(
	T	*	array,
	size_t	old_size,
	size_t	new_size
	)
{
	T * temp = new T[ new_size ];

	copy( array, array + old_size, temp );
	
	if ( array )
	{
		delete [] array;
	}

	return temp;
}


@implementation ServerImpl


- ( id )
init
{
	if ( ( self = [ super init ] ) != NULL )
	{
		NSArray * paths;

		prefPaneBundle	= [ NSBundle bundleWithPath:@"/Library/PreferencePanes/Zimbra.prefPane" ];
		paths			= NSSearchPathForDirectoriesInDomains( NSLibraryDirectory, NSUserDomainMask, YES );
		m_appDir		= [ [ NSString alloc ] initWithString:[ [ paths objectAtIndex:0 ] stringByAppendingPathComponent:@"Application Support/Zimbra" ] ];
		m_dbPath		= [ [ NSString alloc ] initWithFormat:@"%@/ZimbraTestHarness.db", m_appDir ];

		g_zimbraAttributeMappings = [ [ NSMutableDictionary alloc ] init ];

		for ( unsigned i = 0; AttributeMappings[ i ].zcsAttr != NULL; i++ )
		{
			[ g_zimbraAttributeMappings setObject:[ NSValue valueWithPointer:&AttributeMappings[ i ] ] forKey:AttributeMappings[ i ].zcsAttr ];
		}
	}
	
	return self;
}


- ( void )
dealloc
{
	[ m_appDir release ];
	[ super dealloc ];
}


- ( BOOL )
launchHelper:( NSArray* ) args
{
	NSString	*	filename;
	char		**	vecArgs;
	int				numArgs;
	int				pid;
	BOOL			ok = YES;

	filename = [ prefPaneBundle pathForResource:@"ZimbraHelper" ofType:@"" ];
	
	if ( !filename )
	{
		goto exit;
	}
	
	numArgs = [ args count ] + 2;
	
	try
	{
		vecArgs = new char*[ numArgs ];
	}
	catch ( ... )
	{
		vecArgs = NULL;
	}
	
	if ( !vecArgs )
	{
		ok = NO;
		goto exit;
	}
	
	memset( vecArgs, 0, sizeof( char* ) * numArgs );
	
	vecArgs[ 0 ] = ( char* ) [ filename UTF8String ];
	for ( unsigned i = 0; i < [ args count ]; i++ )
	{
		vecArgs[ i + 1 ] = ( char* ) [ [ args objectAtIndex:i ] UTF8String ];
	}
	
	pid = fork();
	
	if ( pid > 0 )
	{
		int status;

		if ( waitpid( pid, &status, 0 ) != -1 )
		{	
			if ( WIFEXITED( status ) )
			{				
				if ( WEXITSTATUS( status ) != 0 )
				{
					ok = NO;
				}
			}
			else if ( WIFSIGNALED( status ) )
			{
				ok = NO;
			}
		}
		else
		{
			ok = NO;
		}
	}
	else if ( pid == 0 )
	{
		execv( [ filename UTF8String ], vecArgs );
		exit( -1 );
	}
	else
	{
		ok = NO;
	}
	
exit:

	return ok;
}


- ( int )
getPort:( NSDictionary* ) account
{
	NSString	*	string;
	int				port;
	
	string = [ account objectForKey:@"ServerPort" ];
	
	if ( string )
	{
		port = [ string intValue ];
	}
	else
	{
		string = [ account objectForKey:@"UseSSL" ];
		
		if ( string && ( [ string compare:@"1" ] == NSOrderedSame ) )
		{
			port = 443;
		}
		else
		{
			port = 80;
		}
	}
	
	return port;
}


- ( NSString* )
findInKeychain:	( NSDictionary* )		account
item:			( SecKeychainItemRef* )	item
{
	NSString	*	server;
	NSString	*	user;
	int				port;
	NSString	*	password		= NULL;
	const char	*	passwordUTF8	= NULL;
	UInt32			passwordLength	= 0;
	OSStatus		err;

	server = [ account objectForKey:@"Server" ];

	user = [ account objectForKey:@"User" ];
	
	port = [ self getPort:account ];

	err = SecKeychainFindInternetPassword( NULL, [ server length ], [ server UTF8String ], 0, NULL, [ user length ], [ user UTF8String ], 0, NULL, port, kSecProtocolTypeHTTP, kSecAuthenticationTypeDefault, &passwordLength, ( void** ) &passwordUTF8, item );
	
	if ( passwordUTF8 )
	{
		password = [ [ [ NSString alloc ] initWithBytes:passwordUTF8 length:passwordLength encoding:NSUTF8StringEncoding ] autorelease ];
	}

exit:

	return password;
}



- ( OSStatus )
addAccountToKeychain:	( NSDictionary* )	account
password:				( NSString* )		password
helperPath:				( NSString* )		helperPath
{
	NSString		*	foundPassword	=	nil;
	SecAccessRef		access			=	nil;
	SecKeychainItemRef	item			=	nil;
	OSStatus			err				=	0;

	foundPassword = [ self findInKeychain:account item:&item ];
	
	if ( !foundPassword )
	{
		NSArray					*	trustedApplications	=	nil;
		SecTrustedApplicationRef	myself;
		SecTrustedApplicationRef	helper;

		// Make an exception list of trusted applications; that is,
		// applications that are allowed to access the item without 
		// requiring user confirmation:

		err = SecTrustedApplicationCreateFromPath( NULL, &myself );

		if ( err )
		{
			goto exit;
		}

		err = SecTrustedApplicationCreateFromPath( [ helperPath UTF8String ], &helper);
		
		if ( err )
		{
			goto exit;
		}
		

		trustedApplications = [NSArray arrayWithObjects: (id) helper, nil ];

		// Create an access object
				
		err = SecAccessCreate((CFStringRef) @"Zimbra", (CFArrayRef) trustedApplications, &access );

		if ( err )
		{
			goto exit;
		}

		{
			NSString	*	server;
			NSString	*	user;
			int				port;
			const char	*	serverUTF8;
			const char	*	userUTF8;
			const char	*	passwordUTF8;
			SecProtocolType	protocol = kSecProtocolTypeHTTP;
			SecAuthenticationType authType = kSecAuthenticationTypeDefault;
			
			server = [ account objectForKey:@"Server" ];
			serverUTF8 = [ server UTF8String ];

			user = [ account objectForKey:@"User" ];
			userUTF8 = [ user UTF8String ];
			
			passwordUTF8 = [ password UTF8String ];
			
			port = [ self getPort:account ];

			SecKeychainAttribute attrs[] =
			{
				{ kSecLabelItemAttr,				6,								(char*) "Zimbra" },
				{ kSecServerItemAttr,				strlen( serverUTF8 ),			( char* ) serverUTF8 },
				{ kSecAccountItemAttr,				strlen( userUTF8 ),				( char* ) userUTF8 },
				{ kSecPortItemAttr,					sizeof( int ),					( int*) &port },
				{ kSecProtocolItemAttr,				sizeof( SecProtocolType ),		( SecProtocolType* ) &protocol },
				{ kSecAuthenticationTypeItemAttr,	sizeof( SecAuthenticationType ),( SecAuthenticationType* ) &authType }
			};
		
			SecKeychainAttributeList attributes = { sizeof(attrs) / sizeof(attrs[0]), attrs };
		
			err = SecKeychainItemCreateFromContent( kSecInternetPasswordItemClass, &attributes, strlen(passwordUTF8), passwordUTF8, NULL, access, &item);

			if ( err )
			{
				goto exit;
			}
		}
	}
	else if ( [ foundPassword compare:password ] != NSOrderedSame )
	{
		err = SecKeychainItemModifyAttributesAndData( item,  NULL,  [ password length ],  [ password UTF8String ] );

		if ( err )
		{
			goto exit;
		}
	}
	
exit:

    if (access)
	{
		CFRelease(access);
	}
	
    if (item)
	{
		CFRelease(item);
	}
	
	return err;
}


- ( void )
removeFile:( NSString* ) path
{
	if ( [ [ NSFileManager defaultManager ] removeFileAtPath:path handler:nil ] == NO )
	{
		NSLog( @"unable to remove file at path: %@", path );
	}
}


- ( void )
removeAccount:( NSDictionary* ) account
{
	NSString			*	clientID;
	NSArray				*	paths;
	NSString			*	logDir;
	NSString			*	command;
	NSString			*	launchAgentFolder	=	nil;
	NSString			*	plistFile			=	nil;
	NSMutableDictionary	*	dict;

	// If we're currently registered as a sync client, then unregister

	clientID = [ account objectForKey:@"ClientID" ];
	
	// Unload from launchctl
	
	launchAgentFolder	= [ @"~/Library/LaunchAgents" stringByExpandingTildeInPath ];
	plistFile			= [ NSString stringWithFormat:@"%@/%@.plist", launchAgentFolder, clientID ];
	dict				= [ NSMutableDictionary dictionaryWithContentsOfFile:plistFile ];
	
	if ( dict )
	{
		command = [ NSString stringWithFormat:@"launchctl unload %@", plistFile ];
		system( [ command UTF8String ] );
		command = [ NSString stringWithFormat:@"rm %@", plistFile ];
		system( [ command UTF8String ] );
	}
	
	// Remove the directory
	
	command = [ NSString stringWithFormat:@"rm -fr \"%@/%@\"", m_appDir, clientID ];
	system( [ command UTF8String ] );

	// Remove the Log Directory

	paths	= NSSearchPathForDirectoriesInDomains( NSLibraryDirectory, NSUserDomainMask, YES );
	logDir	= [ NSString stringWithFormat:@"%@/Logs/Zimbra/%@", [ paths objectAtIndex:0 ], clientID ];
	command = [ NSString stringWithFormat:@"rm -fr \"%@\"", logDir ];
	system( [ command UTF8String ] );
}


- ( void )
parseRawAttribute:	( NSString* )	rawAttrName
attrName:			( NSString*& )	attrName
count:				( unsigned& )	count
{
	// Take care of the special cases.

	if ( [ rawAttrName isEqualToString:@"email" ] )
	{
		attrName	= @"homeEmail";
		count		= 1;
	}
	else if ( [ rawAttrName isEqualToString:@"email2" ] )
	{
		attrName	= @"workEmail";
		count		= 1;
	}
	else if ( [ rawAttrName isEqualToString:@"email3" ] )
	{
		attrName	= @"otherEmail";
		count		= 1;
	}
	else if ( [ rawAttrName isEqualToString:@"imAddress1" ] )
	{
		attrName	= @"homeIM";
		count		= 1;
	}
	else if ( [ rawAttrName isEqualToString:@"imAddress2" ] )
	{
		attrName	= @"workIM";
		count		= 1;
	}
	else if ( [ rawAttrName isEqualToString:@"imAddress3" ] )
	{
		attrName	= @"otherIM";
		count		= 1;
	}
	else
	{
		unsigned last		= [ rawAttrName length ] - 1;
		unsigned current	= last + 1;
	
		for ( unsigned i = last; i > 0; i-- )
		{
			if ( !isdigit( [ rawAttrName characterAtIndex:i ] ) )
			{
				current = i + 1;
				break;
			}
		}
	
		if ( current <= last )
		{
			attrName	= [ rawAttrName substringToIndex:current ];
			count		= [ [ rawAttrName substringFromIndex:current ] intValue ];
		}
		else
		{
			attrName	= rawAttrName;
			count		= 1;
		}
	}
}


- ( BOOL )
convertContactToMac:	( Contact* )	cn
abContact:				( ABRecord* )	abContact
{
	NSMutableDictionary * dbDict;
	NSMutableDictionary * contactDict;
	
	dbDict = [ NSMutableDictionary dictionaryWithContentsOfFile:m_dbPath ];
	
	if ( !dbDict )
	{
		dbDict = [ NSMutableDictionary dictionary ];
	}
	
	contactDict = [ dbDict objectForKey:[ abContact uniqueId ] ];
	
	if ( !contactDict )
	{
		contactDict = [ NSMutableDictionary dictionary ];
		[ dbDict setObject:contactDict forKey:[ abContact uniqueId ] ];
	}

	for ( unsigned i = 0; i < cn->__sizeAttributes; i++ )
	{
		ContactAttribute	*	attribute;
		NSXMLNode			*	rawAttrName;
		NSString			*	attrName;
		unsigned				count;
		NSValue				*	value;
		
		attribute = &cn->a[ i ];

		// The raw name includes information so we can figure out how many of the
		// attribute there are, e.g.
		//
		// 1st email of type "home"
		//    email
		//
		// 2nd email of type "home"
		//    email_2
		//
		// 4th email of type "other"
		//    email3_4
		
		// Parse the attribute to give us the "real" name plus the count

		[ self parseRawAttribute:[ NSString stringWithUTF8String:attribute->n.c_str() ] attrName:attrName count:count ];
		
		// Now look up in table by the real name. We ignore attributes that we
		// don't know about
		
		if ( ( value = [ g_zimbraAttributeMappings objectForKey:attrName ] ) != NULL )
		{
			AttributeMapping * mapping = ( AttributeMapping* ) [ value pointerValue ];

			if ( !mapping->macLabelName )
			{
				objc_msgSend( self, mapping->toMacSelector, abContact, attribute, mapping->macPropertyName, nil, nil, nil, NSNotFound );
			}
			else
			{
				NSString			*	propertyName;
				NSString			*	zcsIdentifier;
				NSString			*	macIdentifier;
				unsigned				index;
				id						value;
				ABMultiValue		*	mv;
				ABMutableMultiValue	*	mmv;
				
				// We'll now do a little kung-fu to make IMs work.
				
				if ( [ mapping->macPropertyName isEqualToString:kABIMsProperty ] )
				{
					// This is a made-up property name. We need to actually look at the
					// value of this attribute to figure out the correct property name.

					NSURL		* url		= [ NSURL URLWithString:[ NSString stringWithUTF8String:attribute->__value.c_str() ] ];
					NSString	* scheme	= [ url scheme ];
					
					if ( [ scheme isEqualToString:@"aim" ] )
					{
						propertyName = kABAIMInstantProperty;
					}
					else if ( [ scheme isEqualToString:@"yahoo" ] )
					{
						propertyName = kABYahooInstantProperty;
					}
					else if ( [ scheme isEqualToString:@"icq" ] )
					{
						propertyName = kABICQInstantProperty;
					}
					else if ( [ scheme isEqualToString:@"msn" ] )
					{
						propertyName = kABMSNInstantProperty;
					}
					else if ( [ scheme isEqualToString:@"local" ] )
					{
						propertyName = kABJabberInstantProperty;
					}
				}
				else
				{
					propertyName = mapping->macPropertyName;
				}
				
				// First thing we're going to want to do is see 
	
				mv = [ abContact valueForProperty:propertyName ];
				
				if ( !mv )
				{
					mmv = [ [ ABMutableMultiValue alloc ] init ];
				}
				else
				{
					mmv = [ mv mutableCopy ];
				}
				
				zcsIdentifier	= [ NSString stringWithFormat:@"%@/%@/%d", propertyName, mapping->macLabelName, count ];

				macIdentifier	= [ contactDict objectForKey:zcsIdentifier ];
				index			= macIdentifier ? [ mmv indexForIdentifier:macIdentifier ] : NSNotFound;
	
				if ( ( macIdentifier = objc_msgSend( self, mapping->toMacSelector, abContact, attribute, propertyName, mapping->macLabelName, mapping->macKeyName, mmv, index ) ) != nil )
				{
					[ contactDict setObject:macIdentifier forKey:zcsIdentifier ];
				}
				
				[ abContact setValue:mmv forProperty:propertyName ];
				
				[ mmv release ];
			}
		}
	}
	
	[ dbDict writeToFile:m_dbPath atomically:YES ];

	return YES;
}


- ( void )
convertStreetAddressesToZCS:	( ABMultiValue* )	streetAddresses
cn:								( Contact& )		cn
{
	unsigned homeCount;
	unsigned workCount;
	unsigned otherCount;

	homeCount	= 0;
	workCount	= 0;
	otherCount	= 0;

	for ( unsigned index = 0; index < [ streetAddresses count ]; index++ )
	{
		NSString		*	label;
		NSDictionary	*	dict;
		unsigned			count;
		NSString		*	value;
		NSString		*	key;
		
		label	= [ streetAddresses labelAtIndex:index ];
		dict	= [ streetAddresses valueAtIndex:index ];
		
		if ( [ label isEqualToString:kABHomeLabel ] )
		{
			count = ++homeCount;
			label = @"home";
		}
		else if ( [ label isEqualToString:kABWorkLabel ] )
		{
			count = ++workCount;
			label = @"work";
		}
		else
		{
			count = ++otherCount;
			label = @"other";
		}
		
		if ( ( value = [ dict objectForKey:kABAddressStreetKey ] ) != NULL )
		{
			key = @"Street";
		}
		else if ( ( value = [ dict objectForKey:kABAddressCityKey ] ) != NULL )
		{
			key = @"City";
		}
		else if ( ( value = [ dict objectForKey:kABAddressStateKey ] ) != NULL )
		{
			key = @"State";
		}
		else if ( ( value = [ dict objectForKey:kABAddressZIPKey ] ) != NULL )
		{
			key = @"PostalCode";
		}
		else if ( ( value = [ dict objectForKey:kABAddressCountryKey ] ) != NULL )
		{
			key = @"Country";
		}

		if ( value )
		{
			cn.a[ cn.__sizeAttributes ].n			= [ [ NSString stringWithFormat:@"%@%@%@", label, key, ( count == 1 ) ? @"" : [ NSString stringWithFormat:@"%d", count ] ] UTF8String ];
			cn.a[ cn.__sizeAttributes ].part		= nil;
			cn.a[ cn.__sizeAttributes ].ct			= nil;
			cn.a[ cn.__sizeAttributes++ ].__value	= [ value UTF8String ];
		}
	}
}


- ( void )
convertPhoneNumbersToZCS:		( ABMultiValue* )	phoneNumbers
cn:								( Contact& )		cn
{
	unsigned homeCount;
	unsigned workCount;
	unsigned mobileCount;
	unsigned mainCount;
	unsigned pagerCount;
	unsigned homeFaxCount;
	unsigned workFaxCount;
	unsigned otherCount;

	homeCount		= 0;
	workCount		= 0;
	mobileCount		= 0;
	mainCount		= 0;
	pagerCount		= 0;
	homeFaxCount	= 0;
	workFaxCount	= 0;
	otherCount		= 0;

	for ( unsigned index = 0; index < [ phoneNumbers count ]; index++ )
	{
		NSString		*	label;
		NSString		*	value;
		unsigned			count;
		
		label	= [ phoneNumbers labelAtIndex:index ];
		value	= [ phoneNumbers valueAtIndex:index ];
		
		if ( [ label isEqualToString:kABPhoneHomeLabel ] )
		{
			count = ++homeCount;
			label = @"home";
		}
		else if ( [ label isEqualToString:kABPhoneWorkLabel ] )
		{
			count = ++workCount;
			label = @"work";
		}
		else if ( [ label isEqualToString:kABPhoneMobileLabel ] )
		{
			count = ++mobileCount;
			label = @"mobile";
		}
		else if ( [ label isEqualToString:kABPhoneMainLabel ] )
		{
			count = ++mainCount;
			label = @"company";
		}
		else if ( [ label isEqualToString:kABPhonePagerLabel ] )
		{
			count = ++pagerCount;
			label = @"pager";
		}
		else if ( [ label isEqualToString:kABPhoneHomeFAXLabel ] )
		{
			count = ++homeFaxCount;
			label = @"homeFax";
		}
		else if ( [ label isEqualToString:kABPhoneWorkFAXLabel ] )
		{
			count = ++workFaxCount;
			label = @"workFax";
		}
		else
		{
			count = ++otherCount;
			label = @"other";
		}

		cn.a[ cn.__sizeAttributes ].n			= [ [ NSString stringWithFormat:@"%@%@", label, ( count == 1 ) ? @"" : [ NSString stringWithFormat:@"%d", count ] ] UTF8String ];
		cn.a[ cn.__sizeAttributes ].part		= nil;
		cn.a[ cn.__sizeAttributes ].ct			= nil;
		cn.a[ cn.__sizeAttributes++ ].__value	= [ value UTF8String ];
	}
}


- ( void )
convertEmailAddressesToZCS:		( ABMultiValue* )	emailAddresses
cn:								( Contact& )		cn
{
	unsigned homeCount;
	unsigned workCount;
	unsigned otherCount;

	homeCount		= 0;
	workCount		= 0;
	otherCount		= 0;

	for ( unsigned index = 0; index < [ emailAddresses count ]; index++ )
	{
		NSString	*	label;
		NSString	*	value;
		unsigned		count;
		
		label	= [ emailAddresses labelAtIndex:index ];
		value	= [ emailAddresses valueAtIndex:index ];
		
		if ( [ label isEqualToString:kABHomeLabel ] )
		{
			count = ++homeCount;
			label = ( count == 1 ) ? @"email" : @"home";
		}
		else if ( [ label isEqualToString:kABWorkLabel ] )
		{
			count = ++workCount;
			label = ( count == 1 ) ? @"email2" : @"work";
		}
		else
		{
			count = ++otherCount;
			label = ( count == 1 ) ? @"email3" : @"other";
		}

		cn.a[ cn.__sizeAttributes ].n			= [ [ NSString stringWithFormat:@"%@%@", label, ( count == 1 ) ? @"" : [ NSString stringWithFormat:@"%d", count ] ] UTF8String ];
		cn.a[ cn.__sizeAttributes ].part		= nil;
		cn.a[ cn.__sizeAttributes ].ct			= nil;
		cn.a[ cn.__sizeAttributes++ ].__value	= [ value UTF8String ];
	}
}


- ( void )
convertURLsToZCS:				( ABMultiValue* )	urls
cn:								( Contact& )		cn
{
	unsigned homeCount;
	unsigned workCount;
	unsigned otherCount;

	homeCount		= 0;
	workCount		= 0;
	otherCount		= 0;

	for ( unsigned index = 0; index < [ urls count ]; index++ )
	{
		NSString	*	label;
		NSString	*	value;
		unsigned		count;
		
		label	= [ urls labelAtIndex:index ];
		value	= [ urls valueAtIndex:index ];
		
		if ( [ label isEqualToString:kABHomeLabel ] || [ label isEqualToString:kABHomePageLabel ] )
		{
			count = ++homeCount;
			label = @"home";
		}
		else if ( [ label isEqualToString:kABWorkLabel ] )
		{
			count = ++workCount;
			label = @"work";
		}
		else
		{
			count = ++otherCount;
			label = @"other";
		}

		cn.a[ cn.__sizeAttributes ].n			= [ [ NSString stringWithFormat:@"%@%@", label, ( count == 1 ) ? @"" : [ NSString stringWithFormat:@"%d", count ] ] UTF8String ];
		cn.a[ cn.__sizeAttributes ].part		= nil;
		cn.a[ cn.__sizeAttributes ].ct			= nil;
		cn.a[ cn.__sizeAttributes++ ].__value	= [ value UTF8String ];
	}
}


- ( void )
convertIMsToZCS:				( ABMultiValue* )	ims
homeCount:						( unsigned& )		homeCount
workCount:						( unsigned& )		workCount
otherCount:						( unsigned& )		otherCount
service:						( NSString* )		service
cn:								( Contact& )		cn
{
	for ( unsigned index = 0; index < [ ims count ]; index++ )
	{
		NSString	*	label;
		NSURL		*	value;
		unsigned		count;
		
		label	= [ ims labelAtIndex:index ];
		value	= [ ims valueAtIndex:index ];
		
		if ( [ label isEqualToString:kABHomeLabel ] )
		{
			count = ++homeCount;
			label = ( count == 1 ) ? @"imAddress1" : @"home";
		}
		else if ( [ label isEqualToString:kABWorkLabel ] )
		{
			count = ++workCount;
			label = ( count == 1 ) ? @"imAddress2" : @"work";
		}
		else
		{
			count = ++otherCount;
			label = ( count == 1 ) ? @"imAddress3" : @"other";
		}

		cn.a[ cn.__sizeAttributes ].n			= [ [ NSString stringWithFormat:@"%@%@", label, ( count == 1 ) ? @"" : [ NSString stringWithFormat:@"%d", count ] ] UTF8String ];
		cn.a[ cn.__sizeAttributes ].part		= nil;
		cn.a[ cn.__sizeAttributes ].ct			= nil;
		cn.a[ cn.__sizeAttributes++ ].__value	= [ [ NSString stringWithFormat:@"%@://%@", service, value ] UTF8String ];
	}
}


- ( BOOL )
convertContactToZCS:	( ABRecord* )	abContact
cn:						( Contact& )	cn
{
	ABMultiValue	*	mv;
	unsigned			imHomeCount;
	unsigned			imWorkCount;
	unsigned			imOtherCount;

	cn.id = new char[ [ [ abContact uniqueId ] length ] + 1 ];
	strcpy( cn.id, [ [ abContact uniqueId ] UTF8String ] );
	
	cn.__sizeAttributes	= 0;
	cn.a				= new ContactAttribute[ 100 ];

	for ( unsigned i = 0; AttributeMappings[ i ].zcsAttr != NULL; i++ )
	{
		AttributeMapping	*	mapping = &AttributeMappings[ i ];
		id						value;
		
		if ( mapping->macPropertyName && !mapping->macLabelName )
		{
			value = [ abContact valueForProperty:mapping->macPropertyName ];
			
			if ( value )
			{
				cn.a[ cn.__sizeAttributes ].n		= [ mapping->zcsAttr UTF8String ];
				cn.a[ cn.__sizeAttributes ].part	= nil;
				cn.a[ cn.__sizeAttributes ].ct		= nil;
		
				objc_msgSend( self, mapping->toZCSSelector, &cn.a[ cn.__sizeAttributes++ ], value );
			}
		}
	}
	
	// Do address stuff
	
	[ self convertStreetAddressesToZCS:[ abContact valueForProperty:kABAddressProperty ]				cn:cn ];
	[ self convertPhoneNumbersToZCS:[ abContact valueForProperty:kABPhoneProperty ]						cn:cn ];
	[ self convertEmailAddressesToZCS:[ abContact valueForProperty:kABEmailProperty ]					cn:cn ];
	[ self convertURLsToZCS:[ abContact valueForProperty:kABURLsProperty ]								cn:cn ];
	
	imHomeCount		= 0;
	imWorkCount		= 0;
	imOtherCount	= 0;

	[ self convertIMsToZCS:[ abContact valueForProperty:kABAIMInstantProperty ]		homeCount:imHomeCount workCount:imWorkCount otherCount:imOtherCount	service:@"aim"		cn:cn ];
	[ self convertIMsToZCS:[ abContact valueForProperty:kABYahooInstantProperty ]	homeCount:imHomeCount workCount:imWorkCount otherCount:imOtherCount	service:@"yahoo"	cn:cn ];
	[ self convertIMsToZCS:[ abContact valueForProperty:kABMSNInstantProperty ]		homeCount:imHomeCount workCount:imWorkCount otherCount:imOtherCount	service:@"msn"		cn:cn ];
	[ self convertIMsToZCS:[ abContact valueForProperty:kABICQInstantProperty ]		homeCount:imHomeCount workCount:imWorkCount otherCount:imOtherCount	service:@"icq"		cn:cn ];
	[ self convertIMsToZCS:[ abContact valueForProperty:kABJabberInstantProperty ]	homeCount:imHomeCount workCount:imWorkCount otherCount:imOtherCount	service:@"jabber"	cn:cn ];
			
	return YES;
}


- ( id )
encodeMultiValue:	( ABRecord* )				record
encoded:			( id )						encoded
propertyName:		( NSString* )				propertyName
labelName:			( NSString* )				labelName
keyName:			( NSString* )				keyName
mmv:				( ABMutableMultiValue* )	mmv
index:				( unsigned )				index
{
	NSString * ident;
	
	ident = nil;

	if ( index == NSNotFound )
	{
		if ( keyName )
		{
			ident = [ mmv addValue:[ NSDictionary dictionaryWithObject:encoded forKey:keyName ] withLabel:labelName ]; 
		}
		else
		{
			ident = [ mmv addValue:encoded withLabel:labelName ];
		}
	}
	else if ( [ encoded length ] )
	{
		if ( keyName )
		{
			NSDictionary		*	dict;
			NSMutableDictionary	*	mDict;
			
			dict	= [ mmv valueAtIndex:index ];
			mDict	= [ dict mutableCopy ];
			
			[ mDict setValue:encoded forKey:keyName ];
			
			[ mmv replaceValueAtIndex:index withValue:mDict ];
			
			[ mDict release ];
		}
		else
		{
			[ mmv replaceValueAtIndex:index withValue:encoded ];
		}
	}
	else
	{
		if ( keyName )
		{
			NSDictionary		*	dict;
			NSMutableDictionary	*	mDict;
			
			dict	= [ mmv valueAtIndex:index ];
			mDict	= [ dict mutableCopy ];
			
			[ mDict removeObjectForKey:keyName ];
			
			[ mmv replaceValueAtIndex:index withValue:mDict ];
			
			[ mDict release ];
		}
		else
		{
			[ mmv removeValueAndLabelAtIndex:index ];
		}
	}
	
	[ record setValue:mmv forProperty:propertyName ];
	
	return ident;
}


- ( id )
encodeToMacIdentity:	( ABRecord* )				record
attribute:				( ContactAttribute* )		attribute
propertyName:			( NSString* )				propertyName
labelName:				( NSString* )				labelName
keyName:				( NSString* )				keyName
mmv:					( ABMutableMultiValue* )	mmv
index:					( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );

	NSString * encoded;
	NSString * ident;
	
	encoded = [ NSString stringWithUTF8String:attribute->__value.c_str() ];
	ident	= nil;

	// If mmv is null, then that means this is a simple property

	if ( !mmv )
	{
		if ( [ encoded length ] )
		{
			[ record setValue:encoded forProperty:propertyName ];
		}
		else
		{
			[ record removeValueForProperty:propertyName ];
		}
	}
	else
	{
		ident = [ self encodeMultiValue:record encoded:encoded propertyName:propertyName labelName:labelName keyName:keyName mmv:mmv index:index ];
	}
	
	return ident;
}


- ( id )
encodeToZCSIdentity:	( ContactAttribute* )			attribute
value:					( id )							value
{
	attribute->__value = [ value UTF8String ];
	return nil;
}


- ( id )
encodeToMacImage:	( ABRecord* )				record
attribute:			( ContactAttribute* )		attribute
propertyName:		( NSString* )				propertyName
labelName:			( NSString* )				labelName
keyName:			( NSString* )				keyName
mmv:				( ABMutableMultiValue* )	mmv
index:				( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );
/*
imagePart = [ [ xml attributeForName:@"part" ] stringValue ];
		imageMIME = [ [ xml attributeForName:@"ct" ] stringValue ];
				
		path = [ NSString stringWithFormat:@"service/home/~/?auth=co&id=%@&part=%@&t=%d", contactIdentifier, imagePart, time( NULL ) ];

		if ( ( imageData = [ m_zimbraClient get:path expectedMIMEType:imageMIME ] ) != NULL )
		{
			[ record setObject:imageData forKey:@"image" ];
		}
*/
/*
	if ( recordDict )
	{
		[ recordDict setValue:[ NSString stringWithUTF8String:attribute->__value.c_str() ] forKey:mapping->macPropertyName ];
	}
	else if ( record )
	{
		[ record setValue:[ NSString stringWithUTF8String:attribute->__value.c_str() ] forProperty:mapping->macPropertyName ];
	}
*/
}


- ( id )
encodeToMacDisplayAs:	( ABRecord* )				record
attribute:				( ContactAttribute* )		attribute
propertyName:			( NSString* )				propertyName
labelName:				( NSString* )				labelName
keyName:				( NSString* )				keyName
mmv:					( ABMutableMultiValue* )	mmv
index:					( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );

	NSNumber * encoded;
	
	encoded = ( attribute->__value == "3" ) ? [ NSNumber numberWithInt:kABShowAsCompany ] : [ NSNumber numberWithInt:kABShowAsPerson ];

	[ record setValue:encoded forProperty:propertyName ];
	
	return nil;
}


- ( id )
encodeToZCSDisplayAs:	( ContactAttribute* )			attribute
value:					( id )							value
{
	int num;
	
	num = [ value intValue ];
	
	if ( num == kABShowAsCompany )
	{
		attribute->__value = "3";
	}
	else
	{
		attribute->__value = "0";
	}

	return nil;
}



- ( id )
encodeToMacDate:	( ABRecord* )				record
attribute:			( ContactAttribute* )		attribute
propertyName:		( NSString* )				propertyName
labelName:			( NSString* )				labelName
keyName:			( NSString* )				keyName
mmv:				( ABMutableMultiValue* )	mmv
index:				( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );

	NSCalendarDate * encoded;
	
	encoded = [ NSCalendarDate dateWithString:[ NSString stringWithFormat:@"%s 12:00:00 +0000", attribute->__value.c_str() ] ];

	[ record setValue:encoded forProperty:propertyName ];
	
	return nil;
}


- ( id )
encodeToZCSDate:	( ContactAttribute* )		attribute
value:				( id )						value
{
 
	attribute->__value = [ [ value descriptionWithCalendarFormat:@"%Y-%m-%d" timeZone:nil locale:nil ] UTF8String ];
	return nil;
}


- ( id )
encodeToMacURL:		( ABRecord* )				record
attribute:			( ContactAttribute* )		attribute
propertyName:		( NSString* )				propertyName
labelName:			( NSString* )				labelName
keyName:			( NSString* )				keyName
mmv:				( ABMutableMultiValue* )	mmv
index:				( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );

	NSURL * encoded;
	
	if ( attribute->__value.size() > 0 )
	{
		//encoded = [ NSURL URLWithString:[ NSString stringWithUTF8String:attribute->__value.c_str() ] ];
		encoded = [ NSString stringWithUTF8String:attribute->__value.c_str() ];
	}
	else
	{
		encoded = nil;
	}
	
	return [ self encodeMultiValue:record encoded:encoded propertyName:propertyName labelName:labelName keyName:keyName mmv:mmv index:index ];
}


- ( id )
encodeToMacIM:		( ABRecord* )				record
attribute:			( ContactAttribute* )		attribute
propertyName:		( NSString* )				propertyName
labelName:			( NSString* )				labelName
keyName:			( NSString* )				keyName
mmv:				( ABMutableMultiValue* )	mmv
index:				( unsigned )				index
{
	NSLog( @"in encode: %s->%s", attribute->n.c_str(), attribute->__value.c_str() );

	NSString * encoded;

	if ( attribute->__value.size() > 0 )
	{
		NSURL		*	url;
		
		url		= [ NSURL URLWithString:[ NSString stringWithUTF8String:attribute->__value.c_str() ] ];
		encoded	= [ [ url description ] substringFromIndex:[ [ url scheme ] length ] + 3 ];
	}
	else
	{
		encoded = nil;
	}
	
	return [ self encodeMultiValue:record encoded:encoded propertyName:propertyName labelName:labelName keyName:keyName mmv:mmv index:index ];
}


- ( int )
createClientRequest:	( const std::string& )		clientApp
account:				( const std::string& )		account
password:				( const std::string& )		password
incoming:				( Incoming* )				incoming
response:				( CreateClientResponse* )	response
{
	NSDictionary		*	dict;
	NSMutableDictionary	*	newAccount;
	NSString			*	clientID;
	NSArray				*	accounts;
	NSArray				*	paths;
	NSString			*	accountFile;
	NSString			*	abFolder;
	NSString			*	iCalFolder1;
	NSString			*	iCalFolder2;
	NSString			*	syncServicesFolder;
	CFUUIDRef				uuidRef;
    CFUUIDBytes				uuidBytes;
	NSString			*	descriptionFilePath;
	ISyncClient			*	syncClient;
	NSString			*	command;

	NSLog( @"account = %s, password = %s, incoming->name = %s", account.c_str(), password.c_str(), incoming->name.c_str() );
	
	// First remove any extant accounts

	accountFile	= [ m_appDir stringByAppendingPathComponent:@"Zimbra.plist" ];
	dict		= [ NSDictionary dictionaryWithContentsOfFile:accountFile ];
	accounts	= [ dict objectForKey:@"Accounts" ];
	
	for ( unsigned i = 0; i < [ accounts count ]; i++ )
	{
		[ self removeAccount:[ accounts objectAtIndex:i ] ];
	}
	
	// Now wipe the AB, iCal, and Sync Services...this is ugly
	
	system( "/usr/bin/killall 'Address Book' iCal SyncServer syncuid" );

	paths				= NSSearchPathForDirectoriesInDomains( NSLibraryDirectory, NSUserDomainMask, YES );
	abFolder			= [ [ paths objectAtIndex:0 ] stringByAppendingPathComponent:@"Application Support/AddressBook" ];
	iCalFolder1			= [ [ paths objectAtIndex:0 ] stringByAppendingPathComponent:@"Application Support/iCal" ];
	iCalFolder2			= [ [ paths objectAtIndex:0 ] stringByAppendingPathComponent:@"Calendars" ];
	syncServicesFolder	= [ [ paths objectAtIndex:0 ] stringByAppendingPathComponent:@"Application Support/SyncServices" ];

	[ self removeFile:abFolder ];
	[ self removeFile:iCalFolder1 ];
	[ self removeFile:iCalFolder2 ];
	[ self removeFile:syncServicesFolder ];
	[ self removeFile:accountFile ];

	// Now add the account
				
	newAccount	= [ NSMutableDictionary dictionary ];
	uuidRef     = CFUUIDCreate( NULL );
	uuidBytes   = CFUUIDGetUUIDBytes( uuidRef );
	clientID	= [ NSString stringWithFormat:@"com.zimbra.%x%x%x%x-%x%x%x%x-%x%x%x%x-%x%x%x%x", @"", uuidBytes.byte0, uuidBytes.byte1, uuidBytes.byte2, uuidBytes.byte3, uuidBytes.byte4, uuidBytes.byte5, uuidBytes.byte6, uuidBytes.byte7, uuidBytes.byte8, uuidBytes.byte9, uuidBytes.byte10, uuidBytes.byte11, uuidBytes.byte12, uuidBytes.byte13, uuidBytes.byte14, uuidBytes.byte15 ];

	[ newAccount setObject:[ NSString stringWithFormat:@"%s", account.c_str() ]			forKey:@"Description" ];
	[ newAccount setObject:[ NSString stringWithFormat:@"%s", incoming->name.c_str() ]	forKey:@"Server" ];
	[ newAccount setObject:[ NSString stringWithFormat:@"%s", account.c_str() ]			forKey:@"User" ];
	[ newAccount setObject:clientID														forKey:@"ClientID" ];
	[ newAccount setObject:@"1"															forKey:@"SyncCalendars" ];
	[ newAccount setObject:@"1"															forKey:@"SyncContacts" ];
	[ newAccount setObject:@"1"															forKey:@"Debug" ];
	
	if ( incoming->port )
	{
		[ newAccount setObject:[ NSString stringWithFormat:@"%d", *incoming->port ]	forKey:@"ServerPort" ];
	}
	
	if ( incoming->encryption )
	{
		if ( strcmp( incoming->encryption, "yes" ) == 0 )
		{
			[ newAccount setObject:@"1" forKey:@"UseSSL" ];
		}
	}
	
	descriptionFilePath = [ prefPaneBundle pathForResource:@"SyncClient" ofType:@"plist" ];
	
	if ( !descriptionFilePath )
	{
		NSLog( @"unable to get description file" );
		goto exit;
	}
	
	sleep( 5 );

	syncClient = [ [ ISyncManager sharedManager ] registerClientWithIdentifier:clientID descriptionFilePath:descriptionFilePath ];
	
	if ( !syncClient )
	{
		NSLog( @"unable to create sync client" );
		goto exit;
	}

	[ syncClient setShouldSynchronize:NO withClientsOfType:@"app" ];
	[ syncClient setSyncAlertToolPath:@"" ];
	
	command = [ NSString stringWithFormat:@"mkdir \"%@/%@\"", m_appDir, clientID ];
	system( [ command UTF8String ] );

	[ [ NSDictionary dictionaryWithObject:[ NSArray arrayWithObject:newAccount ] forKey:@"Accounts" ] writeToFile:accountFile atomically:YES ];
	
	[ self addAccountToKeychain:newAccount password:[ NSString stringWithFormat:@"%s", password.c_str() ] helperPath:[ prefPaneBundle pathForResource:@"ZimbraHelper" ofType:@"" ] ];
	
	response->profileToken = [ clientID UTF8String ];

exit:

	return SOAP_OK;
}


- ( int )
syncRequest:			( const std::string& )		profileToken
delay:					( ZDelay* )					delay
response:				( SyncResponse* )			response
{
	if ( [ self launchHelper:[ NSArray arrayWithObjects:@"--sync", [ NSString stringWithFormat:@"%s", profileToken.c_str() ], nil ] ] )
	{
		return SOAP_OK;
	}
	else
	{
		return SOAP_FAULT;
	}
}


- ( int )
createContactRequest:	( const std::string& )		profileToken
cn:						( Contact* )				cn
response:				( CreateContactResponse* )	response
{
	ABRecord * abContact;
	
	abContact = [ [ ABPerson alloc ] init ];

	if ( [ self convertContactToMac:cn abContact:abContact ] )
	{
		ABAddressBook * addressBook;

		addressBook = [ABAddressBook sharedAddressBook];

		[ addressBook addRecord:abContact ];
		
		[ addressBook save ];
		
		response->cn = cn;
		
		response->cn->id = strdup( [ [ abContact uniqueId ] UTF8String ] );
	}
	
	return SOAP_OK;
}


- ( int )
modifyContactRequest:	( const std::string& )		profileToken
replace:				( int* )					replace
cn:						( Contact* )				cn
response:				( ModifyContactResponse* )	response
{
	ABRecord * abContact;
	
	if ( ( abContact = [ [ ABAddressBook sharedAddressBook ] recordForUniqueId:[ NSString stringWithUTF8String:cn->id ] ] ) != NULL )
	{
		if ( replace && ( *replace == 1 ) )
		{
		}

		if ( [ self convertContactToMac:cn abContact:abContact ] )
		{
			ABAddressBook * addressBook;

			addressBook = [ABAddressBook sharedAddressBook];

			if ( [ addressBook hasUnsavedChanges ] )
			{
				[ addressBook save ];
			}

			response->cn = cn;			
		}
	}

	return SOAP_OK;
}


- ( int )
getContactsRequest:		( const std::string& )		profileToken
l:						( char* )					l
cn:						( Contact* )				cn
response:				( GetContactsResponse* )	response
{
	NSArray	* contacts;
	
	contacts					= [ [ NSString stringWithUTF8String:cn->id ] componentsSeparatedByString:@"," ];
	response->__sizeContacts	= [ contacts count ];
	response->cn				= new Contact[ response->__sizeContacts ];

	for ( unsigned i = 0; i < [ contacts count ]; i++ )
	{
		NSString	*	contactIdentifier;
		ABRecord	*	abContact;

		contactIdentifier = [ contacts objectAtIndex:i ];

		if ( ( abContact = [ [ ABAddressBook sharedAddressBook ] recordForUniqueId:contactIdentifier ] ) != NULL )
		{
			[ self convertContactToZCS:abContact cn:response->cn[ i ] ];
		}
	}

	return SOAP_OK;
}


@end
