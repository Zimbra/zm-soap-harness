//
//  ApplicationController.mm
//  TestHarness
//
//  Created by Scott Herscher on 12/10/07.
//  Copyright 2007 __MyCompanyName__. All rights reserved.
//

#import "ApplicationController.h"
#import "ns.nsmap"


static const char * server = "http://localhost:5555/service/soap";


@implementation ApplicationController


- ( void )
awakeFromNib
{
	m_soap = new soap;

	soap_init1( m_soap, SOAP_IO_KEEPALIVE );

	// Call CreateClientRequest

	CreateClientResponse	createClientResponse;
	SyncResponse			syncResponse;
	Incoming				incoming;

	incoming.name		= "dogfood.zimbra.com";
	incoming.port		= new int;
	*incoming.port		= 443;
	incoming.encryption = "YES";

	soap_call_CreateClientRequest( m_soap, server, "", "urn:zimbraCSAccount", "iSync", "scott.herscher", "rhythmpig", &incoming, &createClientResponse );

	if ( m_soap->error )
	{
		soap_print_fault( m_soap, stderr );
		exit(1);
	}
	
	m_profileToken = [ [ NSString alloc ] initWithFormat:@"%s", createClientResponse.profileToken.c_str() ];	
}


- ( void )
cleanup
{
	soap_destroy( m_soap );
	soap_end( m_soap );
	soap_done( m_soap );
	
	delete m_soap;
}


- ( void )
populateContact:( Contact& ) cn
{
	NSArray * cells;
	
	cells = [ m_form cells ];
	
	cn.__sizeAttributes = 0;
	cn.a = new ContactAttribute[ 50 ];

	for ( unsigned i = 0; i < [ cells count ]; i++ )
	{
		NSFormCell * cell;
		
		cell = [ cells objectAtIndex:i ];

		if ( [ [ cell stringValue ] length ] > 0 )
		{
			cn.a[ cn.__sizeAttributes ].n		= [ [ cell title ] UTF8String ];
			cn.a[ cn.__sizeAttributes ].__value	= [ [ cell stringValue ] UTF8String ];
			cn.a[ cn.__sizeAttributes ].part	= nil;
			cn.a[ cn.__sizeAttributes ].ct		= nil;
			
			cn.__sizeAttributes++;
		}		
	}
}


- ( IBAction )
createContact:( id ) sender
{
	ProfileToken			profileToken;
	CreateContactResponse	response;
	Contact				*	cn;

	cn = new Contact;
	
	[ self populateContact:*cn ];
	
	m_soap->header = new SOAP_ENV__Header;
	
	profileToken.__value = [ m_profileToken UTF8String ];
	
	m_soap->header->context.profileToken = &profileToken;

	soap_call_CreateContactRequest( m_soap, server, "", "urn:zimbraCSAccount", nil, cn, &response );
	
	m_zid = [ [ NSString alloc ] initWithFormat:@"%s", response.cn->id ];
}


- ( IBAction )
modifyContact:( id ) sender
{
	ProfileToken			profileToken;
	ModifyContactResponse	response;
	Contact				*	cn;

	cn = new Contact;
	
	cn->id = ( char* ) [ m_zid UTF8String ];

	[ self populateContact:*cn ];
	
	m_soap->header = new SOAP_ENV__Header;
	
	profileToken.__value = [ m_profileToken UTF8String ];
	
	m_soap->header->context.profileToken = &profileToken;

	soap_call_ModifyContactRequest( m_soap, server, "", "urn:zimbraCSAccount", nil, nil, cn, &response );	
}


- ( IBAction )
getContact:( id ) sender
{
	ProfileToken			profileToken;
	GetContactsResponse		response;
	Contact				*	cn;

	cn = new Contact;
	
	cn->id = ( char* ) [ m_zid UTF8String ];
	
	m_soap->header = new SOAP_ENV__Header;
	
	profileToken.__value = [ m_profileToken UTF8String ];
	
	m_soap->header->context.profileToken = &profileToken;

	soap_call_GetContactsRequest( m_soap, server, "", "urn:zimbraCSAccount", nil, nil, nil, cn, &response );
	
	for ( unsigned i = 0; i < response.__sizeContacts; i++ )
	{
		Contact * cn;
		
		cn = &response.cn[ i ];
		fprintf( stderr, "Contact %s\n{\n", cn->id );
		
		for ( unsigned j = 0; j < cn->__sizeAttributes; j++ )
		{
			ContactAttribute * a;
			
			a = &cn->a[ j ];
			fprintf( stderr, "%s -> %s\n", a->n.c_str(), a->__value.c_str() );
		}
		
		fprintf( stderr, "}\n" );
	}
}


@end
