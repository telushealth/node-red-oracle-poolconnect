module.exports = function(RED) {
    //#region requires
    const oracledb = require('oracledb')
    oracledb.fetchAsString = [ oracledb.CLOB ];

    //#endregion
    
    //#region Execution Node
    
    function OraclePoolConnectExecutionNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.server = RED.nodes.getNode(config.server);
	node.maxrows = config.maxrows;
	    
        node.on('input', async function(msg, send, done) {

            let connection;

            try {
                let sql = msg.topic;
                let binds, options, result;

                dbConfig =  {
                    user: node.server.user,
                    password: node.server.password,
                    connectString : `${node.server.host}:${node.server.port}/${node.server.database}`,
                    externalAuth  : false
                  };
                connection = await oracledb.getConnection(dbConfig);

                binds = {};

                options = {
                outFormat: oracledb.OUT_FORMAT_OBJECT,   // query result format
		maxRows: node.maxrows,
		autoCommit: true,
                // extendedMetaData: true,               // get extra metadata
                // prefetchRows:     100,                // internal buffer allocation size for tuning
                // fetchArraySize:   100                 // internal buffer allocation size for tuning
                };

                result = await connection.execute(sql, binds, options);
                msg.payload = result;
            } catch (err) {
				if(done){
					done(err);
				}
				else {
					node.error(err)
				}
					
            } finally {
                if (connection) {
                    try {
                        await connection.close();
                    } catch (err) {
						if(done){
							done(err);
						}
						else {
							node.error(err)
						}
                    }
                }
            }
            node.send(msg);
        });
	node.on('close', function() {
    		// tidy up any state
	});
    }
    }
    //#endregion
    
    //#region Config Node
    
    function OraclePoolConnectConfigNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
        this.database = n.database;
        this.user = n.user;
        this.password = n.password;
	this.poolMin = n.poolMin;
	this.poolMax = n.poolMax;
	this.poolIncrement = n.poolIncrement;

	oracledb.createPool({
		user: this.user,
	    	password: this.password,
	    	connectString : `${this.host}:${this.port}/${this.database}`,
	    	externalAuth  : false,
		poolIncrement : this.poolIncrement,
            	poolMax       : this.poolMin,
            	poolMin       : this.poolMax,
		enableStatistics : true
	});
	this.on('close', function() {
    		await oracledb.getPool().close(5);
	});
    }

    //#endregion
    
    RED.nodes.registerType("oracle-poolconnect", OraclePoolConnectExecutionNode);
    RED.nodes.registerType("oracle-poolconnect-config", OraclePoolConnectConfigNode);

}










