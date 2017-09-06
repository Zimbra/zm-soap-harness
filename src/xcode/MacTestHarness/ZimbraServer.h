class UserAgent
{
public:

	@std::string name;
	@std::string version;
};


class AuthToken
{
public:

	std::string  __value;
};


class NoSession
{
public:

};


class NoNotify
{
public:

};


class Change
{
public:

	@std::string token;
};


class SessionID
{
public:

	std::string   __value;
	@std::string  id;
};


class Context
{
public:

	UserAgent 	*	userAgent;
	AuthToken	*	authToken;
	NoSession 	*	nosession;
	NoNotify	*	nonotify;
	Change		*	change;
	SessionID	*	sessionId;
	@std::string	xmlns;
};


struct SOAP_ENV__Header
{
	Context context;
};


// ------------------------------------------
//
// AuthRequest
//
// ------------------------------------------

class Account
{
public:

	std::string   __value;
	@std::string  by;
};


class Password
{
public:

	std::string   __value;
};


class AuthResponse
{
public:

	std::string   	authToken;
	std::string   	lifetime;
	std::string   	refer;
	SessionID	*	sessionId;
	@std::string	xmlns;
};


int
AuthRequest
	(
	@std::string		xmlns,
	Account			*	account,
	Password		*	password,
	AuthResponse	*	return_
	);


// ------------------------------------------
//
// CheckLicenseRequest
//
// ------------------------------------------

class CheckLicenseResponse
{
	@std::string	xmlns;
	@std::string	status;
};


int
CheckLicenseRequest
	(
	@std::string				xmlns,
	@std::string				feature,
	CheckLicenseResponse	*	return_
	);


// ------------------------------------------
//
// GetFolderRequest
//
// ------------------------------------------

class Folder
{
public:

	int				__sizeFolder;
	class Folder *  folder;
	@int			id;
	@int			rev;
	@int			s;
	@std::string	name;
	@int			n;
	@int			l;
	@char		*	view;
	@char		*	rest;
	@char		*	f;
};


class GetFolderResponse
{
public:

	Folder		*	folder;
	@std::string	xmlns;
};


int
GetFolderRequest
	(
	@std::string			xmlns,
	GetFolderResponse	*	return_
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

	Contact			cn;
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

	Contact			cn;
	@std::string	xmlns;
};


int
ModifyContactRequest
	(
	@std::string				xmlns,
	@char					*	replace,
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

//
