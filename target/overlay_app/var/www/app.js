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
app.use( Express.json() );

app.use( ( req, res, next ) => {
    req.connection.setNoDelay();
    return next();
});

app.get( "/api/version", ( req, res ) => {
    res.status( 200 ).json({ version: 1 });
});

const api = require( Path.join( __dirname, "api.js" ) );
api( app );

const content = require( Path.join( __dirname, "content.js" ) );
content( app );

app.get( "/", ( req, res ) => {
    Fs.access( "/mnt/content/index.html", Fs.constants.R_OK, ( err ) => {
        if( err )
            res.sendFile( Path.join( __dirname, "default.html" ) );
        else
            res.redirect( "/library/" );
    });
});

// Catch-all error
app.use( ( req, res ) => {
    const accept = req.headers[ 'accept' ];
    if( accept && -1 != accept.indexOf( 'application/json' ) )
        return res.status( 404 ).json( { error: "Not Found" } );

    return res.status( 404 ).send( "Not Found: " + req.path );
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
