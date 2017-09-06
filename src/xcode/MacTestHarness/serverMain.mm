#include <Cocoa/Cocoa.h>
#include "ServerImpl.h"
#include <soapH.h>
#include <iostream>
#include "ns.nsmap"


using namespace std;

static ServerImpl * g_impl;


std::ostream&
operator<<(std::ostream& os, const Contact & cn )
{
	os << "Contact\n{\n";
	
	for ( unsigned i = 0; i < cn.__sizeAttributes; i++ )
	{
		os << "\t" << cn.a[ i ].n << " -> " << cn.a[ i ].__value << endl;
	}
	
	os << "}\n";

	return os;
}


int
main
	(
	int			argc,
	char	**	argv
	)
{
	NSAutoreleasePool	*	pool;
	soap					soap;
	int						m;
	int						s; /* master and slave sockets */

	pool = [ [ NSAutoreleasePool alloc ] init ];
	[ NSApplication sharedApplication ];

	g_impl = [ [ ServerImpl alloc ] init ];

	if ( strcmp( argv[ 1  ], "--test" ) == 0 )
	{
		ABRecord	*	record;
		Contact		*	cn;

		record = [ [ ABPerson alloc ] init ];

		cn = new Contact;

		cn->__sizeAttributes = 7;
		cn->a = new ContactAttribute[ 7 ];
		cn->a[ 0 ].n		= "firstName";
		cn->a[ 0 ].__value	= "Bob";
		cn->a[ 1 ].n		= "lastName";
		cn->a[ 1 ].__value	= "Gibson";
		cn->a[ 2 ].n		= "homeStreet";
		cn->a[ 2 ].__value	= "745 Waverley Street";
		cn->a[ 3 ].n		= "homeStreet2";
		cn->a[ 3 ].__value	= "555 Bryant Street #438";
		cn->a[ 4 ].n		= "imAddress1";
		cn->a[ 4 ].__value	= "yahoo://scott";
		cn->a[ 5 ].n		= "email2";
		cn->a[ 5 ].__value	= "scott@porchdogsoft.com";
		cn->a[ 6 ].n		= "fileAs";
		cn->a[ 6 ].__value	= "3";

		[ g_impl convertContactToMac:cn abContact:record ];
		
		NSLog( @"record = %@", record );
		
		cn = new Contact;
		
		[ g_impl convertContactToZCS:record cn:*cn ];
		
		cerr << *cn << endl;
	}
	else
	{
		soap_init(&soap);

		m = soap_bind(&soap, NULL, atoi(argv[1]), 100);
		if ( m < 0 )
		{
			soap_print_fault(&soap, stderr);
			exit(-1);
		}

		fprintf(stderr, "Socket connection successful: master socket = %d\n", m);
		for ( ;; )
		{
			s = soap_accept(&soap);

			fprintf(stderr, "Socket connection successful: slave socket = %d\n", s);
		
			if ( s < 0 )
			{
				soap_print_fault(&soap, stderr);
				exit(-1);
			} 

			soap_serve(&soap);
			soap_end(&soap);
		}

		[ pool release ];

		return 0;
	}
}


SOAP_FMAC5 int SOAP_FMAC6
CreateClientRequest
	(
	soap					*	/* soap */,
	std::string					xmlns,
	std::string					clientApp,
	std::string					account,
	std::string					password,
	Incoming				*	incoming,
	CreateClientResponse	*	return_
	)
{
	return [ g_impl createClientRequest:clientApp account:account password:password incoming:incoming response:return_ ];
}


SOAP_FMAC5 int SOAP_FMAC6
ConnectRequest
	(
	soap					*	/* soap */,
	std::string					xmlns,
	Online					*	online,
	Sync					*	sync,
	ConnectResponse			*	return_
	)
{
	// This is a NO-OP on the Mac

	return SOAP_OK;
}


SOAP_FMAC5 int SOAP_FMAC6
DisconnectRequest
	(
	soap					*	/* soap */,
	std::string					xmlns,
	Sync					*	sync,
	DisconnectResponse		*	return_
	)
{
	// This is a NO-OP on the Mac
	
	return SOAP_OK;
}


SOAP_FMAC5 int SOAP_FMAC6
SyncRequest
	(
	soap					*	soap,
	std::string					xmlns,
	ZDelay					*	delay,
	SyncResponse			*	return_
	)
{
	if ( soap->header->context.profileToken )
	{ 
		return [ g_impl syncRequest:soap->header->context.profileToken->__value delay:delay response:return_ ];
	}
	else
	{
		return SOAP_FAULT;
	}
}


SOAP_FMAC5 int SOAP_FMAC6
CreateContactRequest
	(
	soap					*	soap,
	std::string					xmlns,
	char					*	verbose,
	Contact					*	cn,
	CreateContactResponse	*	return_
	)
{
	if ( soap->header->context.profileToken )
	{
		return [ g_impl createContactRequest:soap->header->context.profileToken->__value cn:cn response:return_ ];
	}
	else
	{
		return SOAP_FAULT;
	}
}


SOAP_FMAC5 int SOAP_FMAC6
ModifyContactRequest
	(
	soap					*	soap,
	std::string					xmlns,
	int						*	replace,
	char					*	verbose,
	Contact					*	cn,
	ModifyContactResponse	*	return_
	)
{
	if ( soap->header->context.profileToken )
	{
		return [ g_impl modifyContactRequest:soap->header->context.profileToken->__value replace:replace cn:cn response:return_ ];
	}
	else
	{
		return SOAP_FAULT;
	}
}


SOAP_FMAC5 int SOAP_FMAC6
GetContactsRequest
	(
	soap					*	soap,
	std::string					xmlns,
	char					*	sortBy,
	char					*	sync,
	char					*	l,
	Contact					*	cn,
	GetContactsResponse		*	return_
	)
{
	if ( soap->header->context.profileToken )
	{
	return [ g_impl getContactsRequest:soap->header->context.profileToken->__value l:l cn:cn response:return_ ];
	}
	else
	{
		return SOAP_FAULT;
	}
}
