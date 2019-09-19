exports.id = 'modbus';
exports.title = 'MODBUS Connector';
exports.group = 'MODBUS';
exports.color = '#f60';
exports.version = '1.0.0';
exports.icon = 'exchange';
exports.input = false;
exports.output = false;
exports.author = 'Martin Smola';
exports.options = { ip: '127.0.0.1', port: 502, unitid: 1 };
exports.traffic = false;
exports.npm = ['modbus-stream'];

exports.html = `<div class="padding">
    <div data-jc="textbox__ip__placeholder:localhost;required:true" class="m">IP address</div>
    <div data-jc="textbox__port__placeholder:502;required:true" class="m">Port</div>
    <div data-jc="textbox__unitid__placeholder:1;required:true" class="m">Unit ID</div>
</div>
<script>
    ON('save.modbus', function(component, options) {
        !component.name && (component.name = '{0}:{1}'.format(options.ip, options.port));
    });
</script>`;

exports.readme = `# Modbus Connector`;

var MODBUS_CONNECTIONS = [];

global.MODBUS = {};

exports.install = function(instance) {
    var modbus = require('modbus-stream');
    var conn;
    var retry = 0;

    ON('modbus.connections.status', modbusstatus);

    function reconfigure() {
        var opts = instance.options;

        opts.connid = instance.name;
        retry = 0;

        disconnect(connect);
    };

    function connect() {
        var opts = instance.options;

        if (retry > 2) {
            conn = null;
            return instance.status('Cannot connect', 'red');
        }

        EMIT('modbus.connections.status', 'connecting', opts.connid);


        modbus.tcp.connect(+opts.port, opts.ip, { debug: "automaton-2454", unitId: +opts.unitid }, function(err, connection){

            if (err != null) {
                reconnect();
                return EMIT('modbus.connections.status', 'error', opts.connid, err);
            }

            conn = connection;
            retry = 0;

            MODBUS_CONNECTIONS.push({ id: opts.connid, conn: conn });

            EMIT('modbus.connections.status', 'connected', opts.connid);

            conn.on('close', function() {
                EMIT('modbus.connections.status', 'close', opts.connid);
                reconnect();
            });

            conn.on('error', function(error) {
                EMIT('modbus.connections.status', 'error', opts.connid, error);
                reconnect();
            });
        });
    };

    function disconnect(cb) {
        if (conn && conn.close)
            conn.close(function(){
                conn = null;
                cb();
            });
        else {
            cb();
        }
    };

    function reconnect() {
        setTimeout(function(){
            EMIT('modbus.connections.status', 'connecting', instance.options.connid);
            setTimeout(function(){
                retry++;
                disconnect(connect);
            }, 2000);
        }, 2000);

    };

    function modbusstatus(status, modbusid, err) {

        if (modbusid !== instance.options.connid)
            return;

        switch (status) {
            case 'connecting':
                instance.status('Connecting', 'lightblue');
                break;
            case 'connected':
                instance.status('Connected', 'green');
                break;
            case 'disconnected':
                instance.status('Disconnected', 'red');
                break;
            case 'close':
                instance.status('Closed', 'red');
                break;
            case 'error':
                instance.status('Error', 'red');
                instance.debug('MODBUS Error\n ID: ' + instance.options.connid + '\n  ' + err);
                break;
        }
    }

    instance.close = function(done) {

        disconnect(done);

        OFF('modbus.connections.status', modbusstatus);
    };

    instance.on('options', reconfigure);
    reconfigure();
};

FLOW.trigger('modbus.connections', function(next) {
    var conns = [];
    MODBUS_CONNECTIONS.forEach(n => conns.push({ id: n.id, name: n.id }));
    next(conns);
});

MODBUS.getConnection = function(connid) {
    return MODBUS_CONNECTIONS.findItem('id', connid);
};
