//
//  ApplicationController.h
//  TestHarness
//
//  Created by Scott Herscher on 12/10/07.
//  Copyright 2007 __MyCompanyName__. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "soapH.h"


@interface ApplicationController : NSObject
{
	IBOutlet	NSForm	*	m_form;
	
	soap				*	m_soap;
	NSString			*	m_profileToken;
	NSString			*	m_zid;
}


- ( IBAction )
createContact:( id ) sender;


- ( IBAction )
modifyContact:( id ) sender;


- ( IBAction )
getContact:( id ) sender;


@end
