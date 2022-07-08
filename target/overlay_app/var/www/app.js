#!/usr/bin/node

const Express = require( 'express' );
const Compression = require( 'compression' );
const HttpShutdown = require( 'http-shutdown' );
const Http = require( 'http' );
const Path = require( 'path' );
const Fs = require( 'fs' );

const app = Express();

app.set( 'strict routing', true );
app.set( 'case sensitive routing', true );

app.use( Compression() );

app.use( ( req, res, next ) => {
    req.connection.setNoDelay();
    return next();
});

app.use( Express.json() );

app.get( "/api/version", ( req, res ) => {
    res.status( 200 ).json({ version: 1 });
});

const api = require( Path.join( __dirname, "api.js" ) );
api( app );

app.all( "*", ( req, res ) => {
    const is_dir = req.path.endsWith( '/' );
    const path = Path.join( "/mnt/content/", Path.normalize( req.path ) );

    Fs.stat( path, ( err, st ) => {
        if( err ) {
            res.status( 404 ).end();
            return;
        }

        if( is_dir && st.isDirectory() ) {
            const accept = req.get( 'Accept' ) || "";
            if( accept.includes( 'application/json' ) ) {
                // Return a JSON directory listing
                Fs.readdir( path, { withFileTypes: true }, async ( err, files ) => {
                    if( err ) {
                        res.status( 500 ).end();
                        return;
                    }

                    const stat = ( path ) => {
                        return new Promise( ( resolve, reject ) => { Fs.stat( path, ( e, s ) => { resolve( e ? null : s ); }); });
                    };

                    let listing = [];
                    for( const file of files ) {
                        let l = {};
                        l.name = file.name;

                        if( file.isDirectory() )
                            l.type = "folder";
                        else {
                            const s = await stat( Path.join( path, file.name ) );
                            l.type = "file";
                            l.size = s.size;
                            l.modified = Math.floor( s.mtime.getTime() / 1000 );
                        }

                        listing.push( l );
                    }

                    res.status( 200 ).json( listing );
                });
            }
            else {
                // Otherwise send index.html if it exists
                const index = Path.join( path, "index.html" );
                Fs.access( index, Fs.constants.R_OK, ( err ) => {
                    if( err )
                        res.status( 404 ).end();
                    else
                        res.sendFile( index );
                });
            }
        }
        else if( !is_dir && st.isFile() )
            res.sendFile( path );
        else
            res.status( 404 ).end();
    });
});

const port = process.env.PORT || 80;
const server = HttpShutdown( Http.createServer( app ) );
server.listen( port );

process.on( 'SIGTERM', () => {
    server.shutdown( ( _err ) => {
        if( _err )
            return console.log( "Shutdown Failed", err.message );
        process.exit( 0 );
    });
});
