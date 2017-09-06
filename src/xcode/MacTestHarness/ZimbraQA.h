// ------------------------------------------
//
// Context
//
// ------------------------------------------

class ProfileToken
{
public:

	std::string		__value;
	@std::string	xmlns;
};


class ClientApp
{
public:

	std::string		__value;
	@std::string	xmlns;

};


class Context
{
public:

	ProfileToken	*	profileToken;
	ClientApp		*	clientApp;
	@std::string		xmlns;
};


struct SOAP_ENV__Header
{
	Context context;
};


// ------------------------------------------
//
// CreateClientRequest
//
// ------------------------------------------

class Incoming
{
public:

	@std::string	name;
	@int		*	port;
	@char		*	encryption;
};


class CreateClientResponse
{
public:

	std::string	profileToken;
};


int
CreateClientRequest
	(
	@std::string				xmlns,
	std::string					clientApp,
	std::string					account,
	std::string					password,
	Incoming				*	incoming,
	CreateClientResponse	*	return_
	);


// ------------------------------------------
//
// ConnectRequest
//
// ------------------------------------------

class Online
{
public:

	std::string	__value;
};


class Sync
{
public:

	@int	*	timeout;
	@char	*	units;
};


class ConnectResponse
{
public:

	std::string	profileToken;
	std::string	clientApp;
};


int
ConnectRequest
	(
	@std::string		xmlns,
	Online			*	online,
	Sync			*	sync,
	ConnectResponse	*	return_
	);


// ------------------------------------------
//
// DisconnectRequest
//
// ------------------------------------------

class DisconnectResponse
{
public:
};


int
DisconnectRequest
	(
	@std::string			xmlns,
	Sync				*	sync,
	DisconnectResponse	*	return_
	);


// ------------------------------------------
//
// SyncRequest
//
// ------------------------------------------

class ZDelay
{
public:

	@int	*	timeout;
	@char	*	units;
};


class SyncResponse
{
public:
};


int
SyncRequest
	(
	@std::string			xmlns,
	ZDelay				*	delay,
	SyncResponse		*	return_
	);
	
	
// ------------------------------------------
//
// CreateContactRequest/ModifyContactRequest/GetContactsRequest
//
// ------------------------------------------

class ContactAttribute
{
public:

	std::string		__value;
	@char		*	part;		// for images
	@char		*	ct;			// for images
	@std::string	n;
};


class Contact
{
public:

	int						__sizeAttributes;
	ContactAttribute	*	a;

	@char				*	id;
	@char				*	l;
	@char				*	t;
};
	

class CreateContactResponse
{
public:

	Contact		*	cn;
	@std::string	xmlns;
};


int
CreateContactRequest
	(
	@std::string				xmlns,
	@char					*	verbose,
	Contact					*	cn,
	CreateContactResponse	*	return_
	);


class ModifyContactResponse
{
public:

	Contact		*	cn;
	@std::string	xmlns;
};


int
ModifyContactRequest
	(
	@std::string				xmlns,
	@int					*	replace,
	@char					*	verbose,
	Contact					*	cn,
	ModifyContactResponse	*	return_
	);


class GetContactsResponse
{
	int			__sizeContacts;
	Contact	*	cn;
};


int
GetContactsRequest
	(
	@std::string				xmlns,
	@char					*	sortBy,
	@char					*	sync,
	@char					*	l,
	Contact					*	cn,
	GetContactsResponse		*	return_
	);
