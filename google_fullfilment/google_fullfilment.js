exports.id = 'googlefullfilment';
exports.title = 'Google Fullfilment';
exports.group = 'Google';
exports.color = '#f60';
exports.version = '1.0.0';
exports.icon = 'google';
exports.input = false;
exports.output = false;
exports.author = 'Martin Smola';
exports.options = {  };
exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6">
			<div data-jc="textbox__url__placeholder:/fullfilment">@(URL)</div>
			<div class="help m">@(Default:) /fullfilment</div>
			<div data-jc="textbox__apikey__required:true">@(Google API Key)</div>
			<div class="help m">@(Required to make request to Google to sync all devices)</div>
			<div data-jc="textbox__server__required:true;placeholder:http\://example.com">@(Server URL)</div>
			<div class="help m">@(Needs to be set as a referer for the API call and also must be same as url registered with Google)</div>
		</div>
	</div>
</div>
<script>
	ON('save.googlefullfilment', function(component, options) {
		!component.name && (component.name = '{0}'.format('Google Fullfilment'));
	});
</script>`;

exports.readme = `# Google Fullfilment
This component works with compatible components from Google group internally.
There's no need to connect them to this component.

Whenever you change a settings in the compatible component a requestSync request is made to Google to sync all devices again.
`;

exports.install = function(instance){

	function reconfigure(){

		var opts = instance.options;
		if (!opts.apikey || !opts.server)
			return instance.status('Not configure', 'red');

		uninstall_route();

		F.route(opts.url || '/fullfilment', fullfilment, ['post', 'id:' + instance.id, 'unauthorized']);

		instance.status('Ready');
	};

	reconfigure();

	instance.on('close', uninstall_route);

	function uninstall_route() {
		UNINSTALL('route', 'id:' + instance.id);
	};

	function fullfilment() {

		var self = this;
		var body = self.body;
		var inputs = body.inputs; 

		var token = self.req.headers.authorization.split(' ')[1];
		if (!token) {
			self.status = 401;
			return self.json({ 
				'requestId': body.requestId,
				'payload': {
					'errorCode': 'noAuthHeader'
				}
			});
		}

		var com = FLOW.findByComponent('oauth2server')[0];

		var user = com.custom.decrypt(token);


// @TODO
// 		instance.send(0, { user: duser, callback: function(user){
// 			if (!user) {
// console.log('no_such_user');
// 				self.status = 401;
// 				return self.json({'error': 'no_such_user'});
// 			}



// 		}});

		var input = inputs[0];

		if (inputs.length > 1)
			console.log('MULTIPLE INPUTS, TIME TO FIX IT');

		if (!input) {
			self.status = 400;
			return self.json({
				'requestId': body.requestId,
				'payload': {
					'errorCode': 'noInputs'
				}
			});
		}

		var intent = input.intent;

		if (intent === 'action.devices.SYNC') {

			var response = Actions.sync(user, body.requestId, input);
			console.log('SYNC response', JSON.stringify(response));
			self.json(response);

		} else if (intent === 'action.devices.QUERY') {

			var response = Actions.query(user, body.requestId, input);
			console.log('QUERY response', JSON.stringify(response));
			self.json(response);

		} else if (intent === 'action.devices.EXECUTE') {

			var response = Actions.execute(user, body.requestId, input);
			console.log('EXECUTE response', JSON.stringify(response));
			self.json(response);

		} else if (intent === 'action.devices.DISCONNECT') {

			var response = Actions.disconnect();
			console.log('DISCONNECT response', JSON.stringify(response));
			self.json(response);
		}
	};

	var timeout;
	var url = 'https://homegraph.googleapis.com/v1/devices:requestSync?key=';

	ON('googlefullfilment.requestsync',  function() {

		if (timeout)
			return;

		timeout = setTimeout(function(){

			var opts = instance.options;
			url = url + opts.apikey;

			U.request(url, ['post'], { 'agentUserId': '123456', 'async': true }, requestSyncCallback, null, { referer: opts.server });

		}, 5000);
	});

	function requestSyncCallback(err, response) {
		console.log('requestSyncCallback', err, response);
	};
};

// ERRORS https://developers.google.com/actions/reference/smarthome/errors-exceptions

var Actions = {
	sync: function(user, requestId, input){

		var devices = [];

		FLOW.find(function(instance){
			if (instance.googlesmarthome)
				devices.push(instance.custom.sync());
		});

		return {
			requestId: requestId,
			payload: {
				agentUserId: user.id, // this should be an actual user id
				devices: devices
			}
		}	
	},
	query: function(user, requestId, input){
		var response = {
			requestId: requestId,
			payload: {
				devices: {}
			}
		};

		var devs = response.payload.devices;
		
		input.payload.devices.forEach(function(d){
			var dev = FLOW.findById(d.id);
			if (!dev)
				devs[d.id] = { errorCode: 'deviceNotFound' };
			else
				devs[d.id] = dev.custom.query(d.customData);
		});

		return response;
	},
	execute: function(user, requestId, input){
		var response = {
			requestId: requestId,
			payload: {
				commands: []
			}
		};
		
		input.payload.commands.forEach(function(com){
			var execed = EXECUTE(com.devices, com.execution);
			response.payload.commands = response.payload.commands.concat(execed);
		});

		return response;
	},
	disconnect: function(){
		return {};
	},
};

function EXECUTE(devices, execute){
	var commands = []
	devices.forEach(function(d){
		var dev = FLOW.findById(d.id);
		if (!dev)
			return commands.push({ ids: [d.id], status: 'ERROR', errorCode: 'deviceNotFound' });
		execute.forEach(function(ex){
			var result = dev.custom.exec(ex);
			var obj = {};
			obj.ids = [d.id];
			obj.status = result.status;
			result.states && (obj.states = result.states);
			result.errorCode && (obj.errorCode = result.errorCode);
			commands.push(obj);
		});
	});
	return commands;
};