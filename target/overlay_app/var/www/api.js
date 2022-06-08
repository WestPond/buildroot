// ----------------------------------------------------------------------------
// Datacast
// ----------------------------------------------------------------------------
const Net = require( 'net' );
const Fs = require( 'fs' );

function ipc( service, method, data, cb )
{
    const req = JSON.stringify( { method: method, data: data } ) + '\0';
    let accum = "";

    const sock = new Net.Socket();
    sock.setTimeout( 5000, () => {
        sock.destroy();
        cb( 500, { error: "Socket Timeout" } );
    });
    sock.setNoDelay();
    sock.on( 'data', ( data ) => {
        for( let i = 0; i < data.length; ++i ) {
            if( data[ i ] == 0 ) {
                accum += data.toString( 'utf-8', 0, i );
                try {
                    const res = JSON.parse( accum );
                    if( undefined == res.code )
                        cb( 500, { error: "Invalid Response:", accum } );
                    else if( 0 == res.code ) {      // This is an event. Ignore it
                        accum = "";
                        data = data.slice( i + 1 );
                        i = 0;
                        continue;
                    }
                    else
                        cb( res.code, res.data );
                }
                catch( e ) {
                    cb( 500, { error: "Invalid Response Data" } );
                }
                sock.destroy();
                return;
            }
        }
        accum += data.toString();
    });
    sock.on( 'error', ( err ) => {
        cb( 500, { error: "Connection Error" } );
        sock.destroy();
    })
    sock.on( 'end', () => {
        cb( 500, { error: "Connection Closed" } );
        sock.destroy();
    })
    sock.connect( '/var/ipc/' + service + '.ctrl', () => {
        sock.end( req );
    });
}

const sysinfo = {
    model: "unknown",
    product: "unknown",
    serial: "00000000",
    version: "0.0.0"
};

function cat( path )
{
    return new Promise( ( resolve, reject ) => {
        Fs.access( path, Fs.constants.R_OK, ( err ) => {
            if( err )
                return resolve( null );
            Fs.readFile( path, 'utf-8', ( err, data ) => {
                if( err )
                    return resolve( null );

                resolve( data.trim() );
            });
        });
    });
}

(async function() {
    sysinfo.model = await cat( "/etc/model" );
    sysinfo.product = await cat( "/etc/product" );
    sysinfo.serial = await cat( "/etc/serial" );
    sysinfo.version = await cat( "/etc/version" );
})();

function system_info( req, res )
{
    res.status( 200 ).json( sysinfo );
};

function datacast_status( req, res )
{
	ipc( "dcrx", "status", null, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function datacast_tune( req, res )
{
    if( !req.params.guid )
        return res.status( 400 ).json({ error: "Invalid request" });
    const guid = req.params.guid.toLowerCase();

    ipc( "dcrx", "tune", Object.assign( { guid: guid }, req.body ), ( code, data ) => {
        res.status( code ).json( data );
    });
}

function library_status( req, res )
{
	ipc( "librarian", "status", null, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function library_manifest_raw( req, res )
{
	ipc( "librarian", "manifest_raw", null, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function library_manifest( req, res )
{
	ipc( "librarian", "manifest", null, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function library_distribution( req, res )
{
    if( !req.params.org )
        return res.status( 400 ).json({ error: "Invalid request" });
	ipc( "librarian", "manifest", { organization: req.params.org }, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function library_content( req, res )
{
    if( !req.params.org || !req.params.dist)
        return res.status( 400 ).json({ error: "Invalid request" });
	ipc( "librarian", "manifest", { organization: req.params.org, distribution: req.params.dist }, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function library_set_org( req, res )
{
    ipc( "librarian", "set_organization", req.body, ( code, data ) => {
		res.status( code ).json( data );
	});
}

function media_status( req, res )
{
	ipc( "embedconfig", "mediastatus", req.socket.localAddress, ( code, data ) => {
		res.status( code ).json( data );
	});
}

module.exports = ( router ) => {
    router.get( "/api/system/info", system_info );

    router.get( "/api/datacast/status", datacast_status );
    router.put( "/api/datacast/channel/:guid", datacast_tune );

	router.get( "/api/library/status", library_status );
	router.get( "/api/library/manifest", library_manifest_raw );
	router.get( "/api/library/manifest/", library_manifest );
	router.get( "/api/library/manifest/:org/", library_distribution );
	router.get( "/api/library/manifest/:org/:dist/", library_content );
	router.put( "/api/library/organization", library_set_org );

	router.get( "/api/media/status", media_status);
};
