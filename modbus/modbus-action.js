exports.id = 'modbusaction';
exports.title = 'MODBUS Action';
exports.group = 'MODBUS';
exports.color = '#f60';
exports.version = '1.0.0';
exports.icon = 'exchange';
exports.input = true;
exports.output = true;
exports.author = 'Martin Smola';
exports.options = { connid: '' };

exports.html = `<div class="padding">
	<div data-jc="dropdown__connid__datasource:modbusconfig.connections;empty:;required:true" class="m">@(MODBUS Connector)</div>
	<div data-jc="dropdown__action__datasource:modbusconfig.actions;empty:;required:true" class="m">@(Action)</div>
</div>
<script>
	var modbusconfig = {
		connections: [],
		actions: [
			// read
			{ id: 'readCoils', name: 'readCoils' },
			{ id: 'readDiscreteInputs', name: 'readDiscreteInputs' },
			{ id: 'readHoldingRegisters', name: 'readHoldingRegisters' },
			{ id: 'readInputRegisters', name: 'readInputRegisters' },
			// write
			{ id: 'writeSingleCoil', name: 'writeSingleCoil' },
			{ id: 'writeSingleRegister', name: 'writeSingleRegister' },
			{ id: 'writeMultipleCoils', name: 'writeMultipleCoils' },
			{ id: 'writeMultipleRegisters', name: 'writeMultipleRegisters' }
		]
	};
	ON('open.modbusaction', function(component, options) {
		TRIGGER('modbus.connections', 'modbusconfig.connections');
	});
	ON('save.modbusaction', function(component, options) {
		!component.name && (component.name = options.connid + '' + options.action);
	});
</script>`;

exports.readme = `# MODBUS Action

NPM module [modbus-stream](https://github.com/node-modbus/stream)

### Input
\`\`\`javascript
{
	// optional, will be used instead of Action set in the settings
	action: 'readHoldingRegisters',

	// optional, default = 0
	address: 0,

	// optional, for read methods only, default = 0
	quantity: 1

	// only for writeSingleCoil and writeSingleRegister
	value:

	// only for writeMultipleRegisters and writeMultipleCoils
	values: 
}
\`\`\`
`;

exports.install = function(instance) {
	var modbus = require('modbus-stream');
	var conn;

	ON('modbus.connections.status', modbusstatus);

	function reconfigure(o, old_options) {
		var opts = instance.options;
		
		if (!opts.connid)
			return instance.status('Not configured', 'red');

		conn = MODBUS.getConnection(opts.connid);

		if (!conn)
			return instance.status('Connection unavailable', 'red');

		conn = conn.conn;

		instance.status('Connector ready', 'green');
	};

	function modbusstatus(status, modbusid, err) {

		if (modbusid !== instance.options.connid)
			return;

		switch (status) {
			case 'connected':
				instance.status('Connector ready', 'green');
				!conn && reconfigure();
				break;
			case 'connecting':
			case 'disconnected':
			case 'close':
			case 'error':
				instance.status('Connector not ready', 'red');
				break;
		}
	}

	instance.on('data', function(flowdata) {
		var data = flowdata.data || {};

		var a = data.action || instance.options.action;
		if (!conn)
			return console.log('No connection');

		if (conn[a]) {
			conn[a](data, function(err, res){
				if (err) {
					console.log('conn', connection);
					flowdata.data = { error: err };
				} else
					flowdata.data = res.response;
				instance.send(flowdata);
			});
		} else {
			flowdata.data = { error: '"{0}" method not supported'.format(a) };
			instance.send(flowdata);
		}
	});

	instance.on('close', function() {
		OFF('modbus.connections.status', modbusstatus);
	});

	instance.on('options', reconfigure);
	reconfigure();
};