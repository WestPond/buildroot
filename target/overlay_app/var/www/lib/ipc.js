// ----------------------------------------------------------------------------
// Service ipc
// ----------------------------------------------------------------------------
const Net = require( 'net' );

module.exports = ( service, method, data, cb ) => {
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
