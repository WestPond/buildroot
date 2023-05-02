const Path = require( 'path' );
const Fs = require( 'fs' );

async function content_get( req, res )
{

    let path = Path.normalize( req.params[ 0 ] );
	if( path == "" || path == "." )
		path = "index.html";
	path = Path.join( "/mnt/content/", path );

	try {
		let stat = await Fs.promises.stat( path );
		if( stat.isDirectory() ) {
			const contents = await Fs.promises.readdir( path, { withFileTypes: true } );
			const listing = [];
			for( c of contents ) {
				stat = await Fs.promises.stat( Path.join( path, c.name ) );
				if( stat.isDirectory() ) {
					listing.push({
						name: c.name,
						type: "folder"
					});
				}
				else {
					listing.push({
						name: c.name,
						type: "file",
						size: stat.size,
						modified: Math.floor( stat.mtime.getTime() / 1000 )
					});
				}
			}
			return res.status( 200 ).json( listing );
		}
		else
			return res.sendFile( path, { dotfiles: 'allow' });
	}
	catch( e ) {
		if( e.errno && e.errno == -2 )
			return res.status( 404 ).end();
		else
			return res.status( 500 ).end();
	}
}

module.exports = ( router ) => {
	router.get( /^\/library\/?(.*)$/, content_get );
};
