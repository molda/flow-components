exports.id = 'oauth2server';
exports.title = 'OAuth2 Server';
exports.group = 'Server';
exports.color = '#f60';
exports.version = '1.0.0';
exports.icon = 'lock';
exports.input = false;
exports.output = [ ' | Find user', ' | Update user' ];
exports.author = 'Martin Smola';
exports.options = { client_id: '', client_secret: '', redirect_uri: 'https://oauth-redirect.googleusercontent.com/r/{change_this_to_your_project_id}', app_secret: '', token_exchange_url: '/oauth2/token' };
exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6">
			<div data-jc="textbox__client_id__required:true" class="m">@(Client ID)</div>
			<div data-jc="textbox__client_secret__required:true" class="m">@(Client Secret)</div>
			<div data-jc="textbox__redirect_uri__required:true">@(Redirect URI)</div>
			<div class="help m">For Google you need: https://oauth-redirect.googleusercontent.com/r/{project_id}</div>
			<div data-jc="textbox__token_exchange_url__required:true;placeholder:/oauth2/token" class="m">@(Token Exchange URL)</div>
			<div data-jc="textbox__app_secret__required:true" class="m">@(App Secret)</div>
			<button class="exec button button-small" data-exec="generate_oauth_app_secret">Generate App Secret</button>

		</div>
	</div>
</div>
<script>
	ON('save.oauth2server', function(component, options) {
		!component.name && (component.name = '{0}'.format('OAuth2 Server'));
	});

	function generate_oauth_app_secret() {
		SET('settings.oauth2server.app_secret', GUID(48));
	};
</script>`;

exports.readme = `# Google OAuth2

## THIS COMPONENT CAN ONLY BE USED ONCE IN FLOW FOR NOW

Only tested with Actions on Google

You need to setup a route to handle user sing-in by yourself (this is the auth url you need to provide to google)
For example https://example.com/oauth2/auth

When google redirects user to your service(to the above mentioned url) a request will have query params like shown bellow
\`?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&state=STATE_STRING&response_type=code\`

To verify CLIENT_ID and REDIRECT_URI use:

\`\`\`javascript
var ok = false;
FLOW.find(function(com_instance){
	if (com_instance.options.client_id === query.client_id && com_instance.options.redirect_uri === query.redirect_uri)
		ok = true;
});
if (ok)
	saveState(user, query.state);
\`\`\`

Save the query.state property recieved in the request to the user object.
After the user logs in you need to find this component and call \`redirect\` method supplying controller and user params.
User object must have a code and state properties.
You can generate code as shown bellow.
State is recieved in GET request.

\`\`\`javascript
var com = FLOW.findByComponent('oauth2server');
// simple_user_obj = { username: '', id: '', role: '' }
// no passwords or any other sensitive data
user.code = com.custom.encrypt(simple_user_obj);
com.custom.redirect(controller, user);
\`\`\`

This component is listening on {Token Exchange URL} url to exchange access_token and refresh_token with client.

## Output
First output - find user 
\`\`\`javascript
{ 
	user: Object, // simple_user_obj as mentioned above
	// find the user and callback(founduser);
	callback: function(user) // should return at least { access_token: ..., refresh_token: ... }
}
\`\`\`

Second output - update user
\`\`\`javascript
{
	type: String,// new_access or new_access_refresh
	user: Object, // updated user object
	token: Object // refresh_token and/or access_token 
}
\`\`\`
`;

exports.install = function(instance){

	var CLIENT_ID = '';
	var CLIENT_SECRET = '';
	var REDIRECT_URI = '';
	var APP_SECRET = '';

	instance.custom.redirect = function(controller, user) {
		controller.redirect(REDIRECT_URI + '?code={0}&state={1}'.format(user.code, user.state));
	};

	instance.custom.encrypt = function(user) {
		return F.encrypt(user, APP_SECRET);
	};

	instance.custom.decrypt = function(user) {
		return F.decrypt(user, APP_SECRET);
	};

	function reconfigure(){

		var opts = instance.options;

		if (!opts.client_id || !opts.client_secret || !opts.redirect_uri || !opts.app_secret || !opts.token_exchange_url)
			return instance.status('Not configured', 'red');

		CLIENT_ID = opts.client_id;
		CLIENT_SECRET = opts.client_secret;
		REDIRECT_URI = opts.redirect_uri;
		APP_SECRET = opts.app_secret;

		uninstall_route();

		F.route(opts.token_exchange_url, token_exchange, ['post', 'id:' + instance.id]);

		instance.status('Ready');
	};

	reconfigure();

	instance.on('close', uninstall_route);

	function uninstall_route() {
		UNINSTALL('route', 'id:' + instance.id);
	};

	function token_exchange() {
		var self = this;
		var body = self.body;

		if (body.client_id !== CLIENT_ID || body.client_secret !== CLIENT_SECRET) {
			self.status = 400;
			return self.json({'error': 'invalid_grant'});
		}

		var duser = decryptToken(body.code, APP_SECRET);

		var flowdata = instance.make(duser);
		flowdata.repository.callback = function(user){

			if (!user) {
				console.log('oauth2:no_such_user');
				self.status = 401;
				return self.json({'error': 'no_such_user'});
			}

			if (body.grant_type === 'authorization_code') {
				user.access_token = getAccessToken(user, APP_SECRET);
				user.refresh_token = getRefreshToken(user, APP_SECRET);			
				var response = {
					token_type: 'Bearer',
					access_token: user.access_token,
					refresh_token: user.refresh_token,
					expires_in: 180 * 24 * 60 * 60 // 180 days
				}

				self.json(response);
				return instance.send(1, { type: 'new_access_refresh', user: user, data: response });
			}

			if (body.grant_type === 'refresh_token') {
				var token = decryptToken(body.refresh_token, APP_SECRET);
				user.access_token = getAccessToken(user, APP_SECRET);
				var response = {
					token_type: 'Bearer',
					access_token: user.access_token,
					expires_in: 180 * 24 * 60 * 60 // 180 days
				}

				self.json(response);
				return instance.send(1, { type: 'new_access', user: user, data: response });
			}
		};
		instance.send(0, flowdata);
	};
};

function getRefreshToken(user, app_secret) {
	var obj = {};
	obj.user = user;
	obj.date = new Date(),
	obj.type = 'refresh_token'
	return F.encrypt(obj, app_secret);
};

function getAccessToken(user, app_secret) {
	var obj = {};
	obj.user = user;
	obj.date = new Date(),
	obj.type = 'access_token'
	return F.encrypt(obj, app_secret);
};

function decryptToken(token, app_secret) {
	return F.decrypt(token, app_secret);
};